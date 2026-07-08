import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const habits = await prisma.habit.findMany({
      orderBy: { createdAt: "desc" },
    });

    const areas = await prisma.area.findMany();
    const projects = await prisma.project.findMany();
    const subProjects = await prisma.subProject.findMany();

    const areaMap = new Map(areas.map((a) => [a.id, a.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const subProjectMap = new Map(subProjects.map((sp) => [sp.id, sp.name]));

    const mappedHabits = habits.map((habit) => ({
      ...habit,
      area: habit.areaId ? areaMap.get(habit.areaId) : null,
      project: habit.projectId ? projectMap.get(habit.projectId) : null,
      subProject: habit.subProjectId ? subProjectMap.get(habit.subProjectId) : null,
    }));

    return NextResponse.json(mappedHabits);
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

    const habit = await prisma.habit.create({
      data: {
        name: body.name,
        frequency: body.frequency || "daily",
        notes: body.notes || "",
        areaId,
        projectId,
        subProjectId,
      },
    });

    const resolvedHabit = {
      ...habit,
      area: body.area || null,
      project: body.project || null,
      subProject: body.subProject || null,
    };

    return NextResponse.json(resolvedHabit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
