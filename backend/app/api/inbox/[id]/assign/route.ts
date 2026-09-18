import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;

    const { id } = await params;

    // Verify ownership of the inbox item
    const existingInboxItem = await prisma.inboxItem.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existingInboxItem) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const body = await req.json();

    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

    if (!areaId && body.area) {
      const area = await prisma.area.findFirst({
        where: { name: body.area, userId: session.user.id },
      });
      if (area) areaId = area.id;
    }

    if (!projectId && body.project) {
      const project = await prisma.project.findFirst({
        where: {
          name: body.project,
          userId: session.user.id,
        },
      });
      if (project) {
        projectId = project.id;
      } else {
        return NextResponse.json({ error: "Project not found" }, { status: 400 });
      }
    }

    if (!subProjectId && body.subProject) {
      const subProject = await prisma.subProject.findFirst({
        where: {
          name: body.subProject,
          userId: session.user.id,
        },
      });
      if (subProject) {
        subProjectId = subProject.id;
      } else {
        return NextResponse.json({ error: "SubProject not found" }, { status: 400 });
      }
    }

    const hierarchyCheck = await verifyHierarchy(session.user.id, areaId, projectId, subProjectId);
    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
    }

    const updateData: any = {
      assigned: true,
      areaId,
      projectId,
      subProjectId: subProjectId || null,
    };

    if (Array.isArray(body.tags)) {
      updateData.tags = body.tags.filter((t: any) => typeof t === "string" && t.trim()).map((t: string) => t.trim());
    }

    const item = await prisma.inboxItem.update({
      where: { id },
      data: updateData,
    });

    const maxTask = await prisma.task.findFirst({
      where: {
        userId: session.user.id,
        inboxItem: {
          areaId: areaId || null,
          projectId: projectId || null,
          subProjectId: subProjectId || null,
        },
      },
      orderBy: {
        order: "desc",
      },
    });
    const nextOrder = maxTask ? maxTask.order + 1 : 0;

    await prisma.task.upsert({
      where: { inboxItemId: id },
      update: {
        order: nextOrder,
      },
      create: {
        inboxItemId: id,
        completed: false,
        order: nextOrder,
        userId: session.user.id,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
