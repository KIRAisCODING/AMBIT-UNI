import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.habit.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    let areaId = body.areaId || undefined;
    let projectId = body.projectId || undefined;
    let subProjectId = body.subProjectId || undefined;

    if (!areaId && body.area) {
      if (body.area === "null") {
        areaId = null;
      } else {
        const area = await prisma.area.findFirst({
          where: { name: body.area },
        });
        if (area) areaId = area.id;
      }
    }

    if (!projectId && body.project) {
      if (body.project === "null") {
        projectId = null;
      } else {
        const project = await prisma.project.findFirst({
          where: {
            name: body.project,
            ...(areaId && areaId !== "null" ? { areaId } : {}),
          },
        });
        if (project) projectId = project.id;
      }
    }

    if (!subProjectId && body.subProject) {
      if (body.subProject === "null") {
        subProjectId = null;
      } else {
        const subProject = await prisma.subProject.findFirst({
          where: {
            name: body.subProject,
            ...(projectId && projectId !== "null" ? { projectId } : {}),
          },
        });
        if (subProject) subProjectId = subProject.id;
      }
    }

    const updatedHabit = await prisma.habit.update({
      where: { id },
      data: {
        name: body.name,
        frequency: body.frequency,
        notes: body.notes,
        ...(areaId !== undefined ? { areaId } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(subProjectId !== undefined ? { subProjectId } : {}),
      },
    });

    return NextResponse.json(updatedHabit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
