import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteProject, ProjectDeletePolicy } from "@/lib/deleteHierarchy";
import { ProjectStatus, TaskStatus } from "@prisma/client";
import { parseISODateTime } from "@/lib/dateUtils";
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

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      area: {
        select: {
          id: true,
          name: true,
          icon: true,
          archivedAt: true,
        },
      },
      subProjects: {
        where: { userId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          _count: {
            select: {
              tasks: true,
              notes: true,
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
          subProjectId: true,
          order: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: {
          subProjects: true,
          tasks: true,
          notes: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Calculate task progress formula per Decision 04 & 06:
  // round(completedNonCancelled / totalNonCancelled * 100)
  const nonCancelled = project.tasks.filter((t) => t.status !== TaskStatus.CANCELLED);
  const completed = nonCancelled.filter((t) => t.status === TaskStatus.COMPLETED);
  const progressPct =
    nonCancelled.length > 0
      ? Math.round((completed.length / nonCancelled.length) * 100)
      : null;

  return NextResponse.json({
    ...project,
    progress: {
      hasTasks: nonCancelled.length > 0,
      totalCount: nonCancelled.length,
      completedCount: completed.length,
      progressPct,
    },
  });
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

  const existingProject = await prisma.project.findFirst({
    where: { id, userId },
  });

  if (!existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updateData: any = {};

  // 1. Name
  if (body.name !== undefined) {
    const rawName = String(body.name).trim();
    if (!rawName) {
      return NextResponse.json(
        { error: "Project name must not be empty" },
        { status: 400 }
      );
    }
    updateData.name = rawName;
  }

  // 2. Description
  if (body.description !== undefined) {
    updateData.description =
      body.description === null ? null : String(body.description).trim();
  }

  // 3. Move Project to different Area (Decision 06)
  if (body.areaId !== undefined && body.areaId !== existingProject.areaId) {
    const targetArea = await prisma.area.findFirst({
      where: { id: body.areaId, userId },
    });

    if (!targetArea) {
      return NextResponse.json(
        { error: "Target Area not found or access denied" },
        { status: 404 }
      );
    }

    if (targetArea.archivedAt !== null) {
      return NextResponse.json(
        { error: "Cannot move project to an archived Area" },
        { status: 400 }
      );
    }

    updateData.areaId = targetArea.id;
  }

  // 4. Status & CompletedAt transitions (Decision 06)
  if (body.status !== undefined) {
    const sUpper = String(body.status).toUpperCase();
    if (sUpper in ProjectStatus) {
      const newStatus = sUpper as ProjectStatus;
      updateData.status = newStatus;

      if (newStatus === ProjectStatus.COMPLETED) {
        if (body.completedAt !== undefined && body.completedAt !== null) {
          try {
            updateData.completedAt = parseISODateTime(body.completedAt);
          } catch {
            updateData.completedAt = existingProject.completedAt || new Date();
          }
        } else {
          updateData.completedAt = existingProject.completedAt || new Date();
        }
      } else {
        updateData.completedAt = null;
      }
    }
  } else if (body.completedAt !== undefined) {
    updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  }

  // 5. TargetDate
  if (body.targetDate !== undefined) {
    if (body.targetDate === null || body.targetDate === "") {
      updateData.targetDate = null;
    } else {
      try {
        updateData.targetDate = parseISODateTime(body.targetDate);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Invalid targetDate: ${err.message}` },
          { status: 400 }
        );
      }
    }
  }

  // 6. Order
  if (typeof body.order === "number") {
    updateData.order = body.order;
  }

  // 7. Independent Archival (Decision 06: Status and archival are independent)
  if (body.archived !== undefined) {
    if (body.archived === true) {
      updateData.archivedAt = existingProject.archivedAt || new Date();
    } else {
      updateData.archivedAt = null;
    }
  } else if (body.archivedAt !== undefined) {
    updateData.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null;
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updateData,
    include: {
      area: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          subProjects: true,
          tasks: true,
          notes: true,
        },
      },
    },
  });

  return NextResponse.json(updatedProject);
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

  // Resolve explicit deletion policy from query param or body
  const url = new URL(req.url);
  const queryPolicy = url.searchParams.get("policy") || url.searchParams.get("mode");

  let parsedPolicy: ProjectDeletePolicy | null = null;
  if (queryPolicy) {
    const qLower = queryPolicy.toLowerCase();
    if (qLower === "preserve" || qLower === "unassign") {
      parsedPolicy = "preserve";
    } else if (qLower === "destructive" || qLower === "delete") {
      parsedPolicy = "destructive";
    }
  }

  // Check body if not in query params
  if (!parsedPolicy) {
    try {
      const body = await req.json();
      const bPolicy = body.policy || body.mode;
      if (bPolicy) {
        const bLower = String(bPolicy).toLowerCase();
        if (bLower === "preserve" || bLower === "unassign") {
          parsedPolicy = "preserve";
        } else if (bLower === "destructive" || bLower === "delete") {
          parsedPolicy = "destructive";
        }
      }
    } catch {
      // Body not provided or not JSON
    }
  }

  // Rejection if no valid explicit policy provided
  if (!parsedPolicy) {
    return NextResponse.json(
      {
        error:
          "Explicit deletion policy ('preserve' or 'destructive') is required. Provide ?policy=preserve or ?policy=destructive.",
      },
      { status: 400 }
    );
  }

  const result = await deleteProject(userId, id, parsedPolicy);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    deletedId: result.deletedId,
    policy: result.policy,
  });
}
