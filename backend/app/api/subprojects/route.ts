import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const includeArchived = searchParams.get("includeArchived") === "true";

  const subprojects = await prisma.subProject.findMany({
    where: {
      userId: session.user.id,
      projectId: projectId || undefined,
      archivedAt: includeArchived ? undefined : null,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  return NextResponse.json(subprojects);
}

export async function POST(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const rawName = body.name !== undefined ? String(body.name).trim() : "";

  if (!rawName) {
    return NextResponse.json(
      { error: "SubProject name must not be empty" },
      { status: 400 }
    );
  }

  if (!body.projectId) {
    return NextResponse.json(
      { error: "projectId is required to create a SubProject" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Validate that the parent project belongs to the user
  const project = await prisma.project.findFirst({
    where: { id: body.projectId, userId },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Invalid Project ID or access denied" },
      { status: 404 }
    );
  }

  // Parent Project must not be archived
  if (project.archivedAt !== null) {
    return NextResponse.json(
      { error: "Cannot create a SubProject in an archived Project" },
      { status: 400 }
    );
  }

  const subproject = await prisma.subProject.create({
    data: {
      userId,
      name: rawName,
      projectId: project.id,
      description: body.description ? String(body.description).trim() : null,
      order: typeof body.order === "number" ? body.order : 0,
    },
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

  return NextResponse.json(subproject, { status: 201 });
}
