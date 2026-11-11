import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteSubProject } from "@/lib/deleteHierarchy";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = session.user.id;

  const subproject = await prisma.subProject.findFirst({
    where: { id, userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          areaId: true,
          area: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tasks: {
        where: { userId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          scheduledDate: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          notes: true,
        },
      },
    },
  });

  if (!subproject) {
    return NextResponse.json(
      { error: "SubProject not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(subproject);
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = session.user.id;

  const existingSubProject = await prisma.subProject.findFirst({
    where: { id, userId },
  });

  if (!existingSubProject) {
    return NextResponse.json(
      { error: "SubProject not found" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const updateData: any = {};

  if (body.name !== undefined) {
    const rawName = String(body.name).trim();
    if (!rawName) {
      return NextResponse.json(
        { error: "SubProject name must not be empty" },
        { status: 400 }
      );
    }
    updateData.name = rawName;
  }

  if (body.description !== undefined) {
    updateData.description =
      body.description === null ? null : String(body.description).trim();
  }

  if (typeof body.order === "number") {
    updateData.order = body.order;
  }

  if (body.archived !== undefined) {
    if (body.archived === true) {
      updateData.archivedAt = existingSubProject.archivedAt || new Date();
    } else {
      updateData.archivedAt = null;
    }
  } else if (body.archivedAt !== undefined) {
    updateData.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null;
  }

  const item = await prisma.subProject.update({
    where: { id },
    data: updateData,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          areaId: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          notes: true,
        },
      },
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = session.user.id;

  // Execute SubProject deletion with transactional task and note promotion to parent project
  const result = await deleteSubProject(userId, id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    deletedId: result.deletedId,
    reassignedToProjectId: result.reassignedToProjectId,
  });
}
