import { auth } from "@/auth";
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
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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