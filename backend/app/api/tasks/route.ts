import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subProjectId = searchParams.get("subProjectId");

    let items;
    if (subProjectId) {
      items = await prisma.inboxItem.findMany({
        where: {
          subProjectId,
          assigned: true,
        },
        include: {
          task: true,
        },
      });
    } else {
      items = await prisma.inboxItem.findMany({
        include: {
          task: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const areas = await prisma.area.findMany();
    const projects = await prisma.project.findMany();
    const subProjects = await prisma.subProject.findMany();

    const areaMap = new Map(areas.map((a) => [a.id, a.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const subProjectMap = new Map(subProjects.map((sp) => [sp.id, sp.name]));

    const mappedItems = items.map((item) => ({
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
    const body = await req.json();

    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

    // Resolve names to IDs if not provided
    if (!areaId && body.area) {
      const area = await prisma.area.findFirst({
        where: { name: body.area },
      });
      if (area) areaId = area.id;
    }

    if (!projectId && body.project) {
      const project = await prisma.project.findFirst({
        where: {
          name: body.project,
          ...(areaId ? { areaId } : {}),
        },
      });
      if (project) projectId = project.id;
    }

    if (!subProjectId && body.subProject) {
      const subProject = await prisma.subProject.findFirst({
        where: {
          name: body.subProject,
          ...(projectId ? { projectId } : {}),
        },
      });
      if (subProject) subProjectId = subProject.id;
    }

    const item = await prisma.inboxItem.create({
      data: {
        content: body.content,
        type: body.type,
        assigned: body.assigned ?? false,
        areaId,
        projectId,
        subProjectId,
      },
    });

    if (item.assigned) {
      await prisma.task.create({
        data: {
          inboxItemId: item.id,
          completed: false,
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
