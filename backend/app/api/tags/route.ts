import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const mapped = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color || null,
      taskCount: t._count.tasks,
      noteCount: t._count.notes,
      totalCount: t._count.tasks + t._count.notes,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const rawName = body.name !== undefined ? String(body.name).trim().toLowerCase() : "";

    if (!rawName) {
      return NextResponse.json(
        { error: "Tag name must not be empty" },
        { status: 400 }
      );
    }

    if (rawName.length > 50) {
      return NextResponse.json(
        { error: "Tag name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const color = body.color ? String(body.color).trim() : null;

    const tag = await prisma.tag.upsert({
      where: {
        userId_name: { userId, name: rawName },
      },
      update: {
        ...(color !== null ? { color } : {}),
      },
      create: {
        userId,
        name: rawName,
        color,
      },
    });

    return NextResponse.json(
      {
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
        createdAt: tag.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

