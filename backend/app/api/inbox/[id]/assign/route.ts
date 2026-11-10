import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyAndNormalizeTaskHierarchy } from "@/lib/verifyHierarchy";
import { CaptureStatus, PromotedType, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Backward-compatible adapter for frontend callers assigning hierarchy.
 * Supports updating an existing Task's hierarchy or promoting an active Capture.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

    // Resolve names to IDs if legacy string names are passed
    if (!areaId && body.area) {
      const a = await prisma.area.findFirst({ where: { name: body.area, userId } });
      if (a) areaId = a.id;
    }
    if (!projectId && body.project) {
      const p = await prisma.project.findFirst({ where: { name: body.project, userId } });
      if (p) projectId = p.id;
    }
    if (!subProjectId && body.subProject) {
      const sp = await prisma.subProject.findFirst({ where: { name: body.subProject, userId } });
      if (sp) subProjectId = sp.id;
    }

    const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
      areaId,
      projectId,
      subProjectId,
    });

    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
    }

    // Check if ID is a Task first
    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (existingTask) {
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          areaId: hierarchyCheck.normalized.areaId,
          projectId: hierarchyCheck.normalized.projectId,
          subProjectId: hierarchyCheck.normalized.subProjectId,
        },
        include: {
          area: true,
          project: { include: { area: true } },
          subProject: { include: { project: { include: { area: true } } } },
          tags: true,
        },
      });

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // Check if ID is a Capture
    const existingCapture = await prisma.capture.findFirst({
      where: { id, userId },
    });

    if (existingCapture) {
      const result = await prisma.$transaction(async (tx) => {
        const maxTask = await tx.task.findFirst({
          where: {
            userId,
            areaId: hierarchyCheck.normalized.areaId,
            projectId: hierarchyCheck.normalized.projectId,
            subProjectId: hierarchyCheck.normalized.subProjectId,
          },
          orderBy: { order: "desc" },
        });
        const order = maxTask ? maxTask.order + 1 : 0;

        const task = await tx.task.create({
          data: {
            userId,
            title: existingCapture.content.slice(0, 200),
            description: existingCapture.content,
            status: TaskStatus.TODO,
            order,
            areaId: hierarchyCheck.normalized.areaId,
            projectId: hierarchyCheck.normalized.projectId,
            subProjectId: hierarchyCheck.normalized.subProjectId,
          },
          include: {
            area: true,
            project: { include: { area: true } },
            subProject: { include: { project: { include: { area: true } } } },
            tags: true,
          },
        });

        const updatedCapture = await tx.capture.update({
          where: { id },
          data: {
            status: CaptureStatus.PROMOTED,
            promotedType: PromotedType.TASK,
            promotedId: task.id,
          },
        });

        return { task, capture: updatedCapture };
      });

      return NextResponse.json({ success: true, task: result.task, capture: result.capture });
    }

    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
