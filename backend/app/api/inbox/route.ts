import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const items = await prisma.inboxItem.findMany({
      where: { assigned: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
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
