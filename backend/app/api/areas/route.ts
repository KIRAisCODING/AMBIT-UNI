import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  const areas = await prisma.area.findMany({
    where: {
      userId: session.user.id,
      archivedAt: includeArchived ? undefined : null,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const rawName = body.name !== undefined ? String(body.name).trim() : "";

  if (!rawName) {
    return NextResponse.json(
      { error: "Area name must not be empty" },
      { status: 400 }
    );
  }

  const area = await prisma.area.create({
    data: {
      userId: session.user.id,
      name: rawName,
      description: body.description ? String(body.description).trim() : null,
      icon: body.icon ? String(body.icon).trim() : null,
      order: typeof body.order === "number" ? body.order : 0,
    },
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

  return NextResponse.json(area, { status: 201 });
}
