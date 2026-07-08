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
