import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const subProjectId = searchParams.get("subProjectId");

    let items;
    if (subProjectId) {
      items = await prisma.inboxItem.findMany({
        where: {
          userId,
          subProjectId,
          assigned: true,
        },
        include: {
          task: true,
        },
        orderBy: [
          {
            task: {
              order: "asc",
            },
          },
          {
            createdAt: "asc",
          },
        ],
      });
    } else {
      items = await prisma.inboxItem.findMany({
        where: {
          userId,
        },
        include: {
          task: true,
        },
        orderBy: [
          {
            task: {
              order: "asc",
            },
          },
          {
            createdAt: "asc",
          },
        ],
      });
    }

    const areas = await prisma.area.findMany({ where: { userId } });
    const projects = await prisma.project.findMany({ where: { userId } });
    const subProjects = await prisma.subProject.findMany({ where: { userId } });

    const areaMap = new Map(areas.map((a: any) => [a.id, a.name]));
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));
    const subProjectMap = new Map(subProjects.map((sp: any) => [sp.id, sp.name]));

    const mappedItems = items.map((item: any) => ({
      ...item,
      area: item.areaId ? areaMap.get(item.areaId) : null,
      project: item.projectId ? projectMap.get(item.projectId) : null,
      subProject: item.subProjectId ? subProjectMap.get(item.subProjectId) : null,
    }));

    return NextResponse.json(mappedItems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json();

    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

    // Resolve names to IDs if not provided
    if (!areaId && body.area) {
      const area = await prisma.area.findFirst({
        where: { name: body.area, userId },
      });
      if (area) areaId = area.id;
    }

    if (!projectId && body.project) {
      const project = await prisma.project.findFirst({
        where: {
          name: body.project,
          userId,
          ...(areaId ? { areaId } : {}),
        },
      });
      if (project) projectId = project.id;
    }

    if (!subProjectId && body.subProject) {
      const subProject = await prisma.subProject.findFirst({
        where: {
          name: body.subProject,
          userId,
          ...(projectId ? { projectId } : {}),
        },
      });
      if (subProject) subProjectId = subProject.id;
    }

    const hierarchyCheck = await verifyHierarchy(userId, areaId, projectId, subProjectId);
    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 403 });
    }

    const item = await prisma.inboxItem.create({
      data: {
        content: body.content,
        type: body.type,
        assigned: body.assigned ?? false,
        areaId,
        projectId,
        subProjectId,
        userId,
      },
    });

    if (item.assigned || body.deadline) {
      const maxTask = await prisma.task.findFirst({
        where: {
          userId,
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
          deadline: body.deadline ? new Date(body.deadline) : null,
          order: nextOrder,
          userId,
        },
      });
    }

    const resolvedItem = {
      ...item,
      area: body.area || null,
      project: body.project || null,
      subProject: body.subProject || null,
    };

    return NextResponse.json(resolvedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
