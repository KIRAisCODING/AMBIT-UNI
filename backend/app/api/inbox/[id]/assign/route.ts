import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership of the inbox item
    const existingInboxItem = await prisma.inboxItem.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existingInboxItem) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

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
          ...(areaId ? { areaId } : {}),
        },
      });
      if (project) projectId = project.id;
    }

    if (!subProjectId && body.subProject) {
      const subProject = await prisma.subProject.findFirst({
        where: {
          name: body.subProject,
          userId: session.user.id,
          ...(projectId ? { projectId } : {}),
        },
      });
      if (subProject) subProjectId = subProject.id;
    }

    const item = await prisma.inboxItem.update({
      where: { id },
      data: {
        assigned: true,
        areaId,
        projectId,
        subProjectId,
      },
    });

    await prisma.task.upsert({
      where: { inboxItemId: id },
      update: {},
      create: {
        inboxItemId: id,
        completed: false,
        userId: session.user.id,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
