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
  const { id } = await params;
  const body = await req.json();

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
  const { id } = await params;
  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "unassign" ? "unassign" : "delete";

  await deleteProject(id, mode);

  return NextResponse.json({
    success: true,
  });
}