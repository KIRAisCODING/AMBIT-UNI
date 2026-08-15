import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteArea } from "@/lib/deleteHierarchy";
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

  // Verify ownership
  const existingArea = await prisma.area.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingArea) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const body = await req.json();

  const area = await prisma.area.update({
    where: {
      id,
    },
    data: {
      name: body.name,
    },
  });

  return NextResponse.json(area);
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
  const existingArea = await prisma.area.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existingArea) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "unassign" ? "unassign" : "delete";

  await deleteArea(id, mode);

  return NextResponse.json({
    success: true,
  });
}