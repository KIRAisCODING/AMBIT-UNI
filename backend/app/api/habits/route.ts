import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const areas = await prisma.area.findMany({ where: { userId } });
    const projects = await prisma.project.findMany({ where: { userId } });
    const subProjects = await prisma.subProject.findMany({ where: { userId } });

    const areaMap = new Map(areas.map((a: any) => [a.id, a.name]));
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));
    const subProjectMap = new Map(subProjects.map((sp: any) => [sp.id, sp.name]));

    const mappedHabits = habits.map((habit: any) => ({
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
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();

    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

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

    const habit = await prisma.habit.create({
      data: {
        name: body.name,
        frequency: body.frequency || "daily",
        notes: body.notes || "",
        areaId,
        projectId,
        subProjectId,
        userId,
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
