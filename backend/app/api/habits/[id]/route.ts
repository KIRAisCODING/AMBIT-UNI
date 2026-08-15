import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    // Verify ownership
    const existingHabit = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!existingHabit) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

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
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    // Verify ownership
    const existingHabit = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!existingHabit) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const body = await req.json();

    let areaId = body.areaId || undefined;
    let projectId = body.projectId || undefined;
    let subProjectId = body.subProjectId || undefined;

    if (!areaId && body.area) {
      if (body.area === "null") {
        areaId = null;
      } else {
        const area = await prisma.area.findFirst({
          where: { name: body.area, userId },
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
            userId,
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
            userId,
            ...(projectId && projectId !== "null" ? { projectId } : {}),
          },
        });
        if (subProject) subProjectId = subProject.id;
      }
    }

    const finalAreaId = areaId !== undefined ? areaId : existingHabit.areaId;
    const finalProjectId = projectId !== undefined ? projectId : existingHabit.projectId;
    const finalSubProjectId = subProjectId !== undefined ? subProjectId : existingHabit.subProjectId;

    const hierarchyCheck = await verifyHierarchy(userId, finalAreaId, finalProjectId, finalSubProjectId);
    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 403 });
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
