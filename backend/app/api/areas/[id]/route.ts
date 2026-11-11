import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteArea } from "@/lib/deleteHierarchy";
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

  const area = await prisma.area.findFirst({
    where: { id, userId },
    include: {
      projects: {
        where: { userId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          _count: {
            select: {
              subProjects: true,
              tasks: true,
              notes: true,
            },
          },
        },
      },
      _count: {
        select: {
          projects: true,
          tasks: true,
          notes: true,
          habits: true,
        },
      },
    },
  });

  if (!area) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  return NextResponse.json(area);
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

  const existingArea = await prisma.area.findFirst({
    where: { id, userId },
  });

  if (!existingArea) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updateData: any = {};

  if (body.name !== undefined) {
    const rawName = String(body.name).trim();
    if (!rawName) {
      return NextResponse.json(
        { error: "Area name must not be empty" },
        { status: 400 }
      );
    }
    updateData.name = rawName;
  }

  if (body.description !== undefined) {
    updateData.description =
      body.description === null ? null : String(body.description).trim();
  }

  if (body.icon !== undefined) {
    updateData.icon = body.icon === null ? null : String(body.icon).trim();
  }

  if (typeof body.order === "number") {
    updateData.order = body.order;
  }

  // Non-destructive archival (Areas cannot be completed, only archived)
  if (body.archived !== undefined) {
    if (body.archived === true) {
      updateData.archivedAt = existingArea.archivedAt || new Date();
    } else {
      updateData.archivedAt = null;
    }
  } else if (body.archivedAt !== undefined) {
    updateData.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null;
  }

  const updatedArea = await prisma.area.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          projects: true,
          tasks: true,
          notes: true,
          habits: true,
        },
      },
    },
  });

  return NextResponse.json(updatedArea);
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

  // Execute Area deletion with strict Decision 02 emptiness guardrail
  const result = await deleteArea(userId, id);

  if (!result.success) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    // Blocked: Area contains children
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        counts: result.counts,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedId: result.deletedId,
  });
}
