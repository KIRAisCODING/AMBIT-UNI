import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;

    const items = await prisma.inboxItem.findMany({
      where: {
        userId: session.user.id,
        assigned: false,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = items.map(it => ({
      ...it,
      tags: Array.isArray(it.tags) ? it.tags : [],
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;

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

    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t: any) => typeof t === "string" && t.trim()).map((t: string) => t.trim())
      : [];

    const item = await prisma.inboxItem.create({
      data: {
        content: body.content,
        type: body.type,
        assigned: body.assigned ?? false,
        areaId,
        projectId,
        subProjectId,
        tags,
        userId: session.user.id,
      },
    });

    if (item.assigned) {
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

      await prisma.task.create({
        data: {
          inboxItemId: item.id,
          completed: false,
          order: nextOrder,
          userId: session.user.id,
        },
      });
    }

    let areaName = body.area || null;
    let projectName = body.project || null;
    let subProjectName = body.subProject || null;

    if (!areaName && areaId) {
      const a = await prisma.area.findUnique({ where: { id: areaId } });
      if (a) areaName = a.name;
    }
    if (!projectName && projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId } });
      if (p) projectName = p.name;
    }
    if (!subProjectName && subProjectId) {
      const sp = await prisma.subProject.findUnique({ where: { id: subProjectId } });
      if (sp) subProjectName = sp.name;
    }

    const resolvedItem = {
      ...item,
      tags: item.tags,
      area: areaName,
      project: projectName,
      subProject: subProjectName,
    };

    return NextResponse.json(resolvedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
