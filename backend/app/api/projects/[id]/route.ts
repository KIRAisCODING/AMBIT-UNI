import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteProject } from "@/lib/deleteHierarchy";
import { NextResponse } from "next/server";

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
  const body = await req.json();

  // Verify ownership
  const existingProject = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingProject) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const project = await prisma.project.update({
    where: {
      id,
    },
    data: {
      name: body.name,
    },
  });

  return NextResponse.json(project);
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

  // Verify ownership
  const existingProject = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingProject) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "unassign" ? "unassign" : "delete";

  await deleteProject(id, mode);

  return NextResponse.json({
    success: true,
  });
}