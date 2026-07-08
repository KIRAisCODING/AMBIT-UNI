import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const items = await prisma.inboxItem.findMany({
      where: {
        task: {
          deadline: {
            not: null,
          },
        },
      },
      include: {
        task: true,
      },
    });

    const areas = await prisma.area.findMany();
    const projects = await prisma.project.findMany();
    const subProjects = await prisma.subProject.findMany();

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
