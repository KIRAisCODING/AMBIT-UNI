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
  const { id } = await params;
  const body = await req.json();

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
  const { id } = await params;
  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "unassign" ? "unassign" : "delete";

  await deleteSubProject(id, mode);

  return NextResponse.json({
    success: true,
  });
}
