import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteSubProject } from "@/lib/deleteHierarchy";
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
  const existingSubProject = await prisma.subProject.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingSubProject) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const item = await prisma.subProject.update({
    where: {
      id,
    },
    data: {
      name: body.name,
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
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existingSubProject = await prisma.subProject.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingSubProject) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "unassign" ? "unassign" : "delete";

  await deleteSubProject(id, mode);

  return NextResponse.json({
    success: true,
  });
}
