import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { parseISODateTime } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const areaId = searchParams.get("areaId");
  const statusParam = searchParams.get("status");
  const includeArchived = searchParams.get("includeArchived") === "true";

  let statusFilter: ProjectStatus | undefined = undefined;
  if (statusParam) {
    const sUpper = statusParam.toUpperCase();
    if (sUpper in ProjectStatus) {
      statusFilter = sUpper as ProjectStatus;
    }
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      areaId: areaId || undefined,
      status: statusFilter,
      archivedAt: includeArchived ? undefined : null,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const rawName = body.name !== undefined ? String(body.name).trim() : "";

  if (!rawName) {
    return NextResponse.json(
      { error: "Project name must not be empty" },
      { status: 400 }
    );
  }

  if (!body.areaId) {
    return NextResponse.json(
      { error: "areaId is required to create a Project" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // 1. Validate that the area belongs to the user
  const area = await prisma.area.findFirst({
    where: { id: body.areaId, userId },
  });

  if (!area) {
    return NextResponse.json(
      { error: "Invalid Area ID or access denied" },
      { status: 404 }
    );
  }

  // 2. Archived Area Guardrail: Archived Areas cannot receive new Projects
  if (area.archivedAt !== null) {
    return NextResponse.json(
      { error: "Cannot create a project in an archived Area" },
      { status: 400 }
    );
  }

  // 3. Parse targetDate if provided
  let targetDate: Date | null = null;
  if (body.targetDate !== undefined && body.targetDate !== null && body.targetDate !== "") {
    try {
      targetDate = parseISODateTime(body.targetDate);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Invalid targetDate: ${err.message}` },
        { status: 400 }
      );
    }
  }

  // 4. Status validation
  let status: ProjectStatus = ProjectStatus.ACTIVE;
  if (body.status) {
    const sUpper = String(body.status).toUpperCase();
    if (sUpper in ProjectStatus) {
      status = sUpper as ProjectStatus;
    }
  }

  const project = await prisma.project.create({
    data: {
      userId,
      name: rawName,
      areaId: area.id,
      description: body.description ? String(body.description).trim() : null,
      status,
      targetDate,
      order: typeof body.order === "number" ? body.order : 0,
    },
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

  return NextResponse.json(project, { status: 201 });
}
