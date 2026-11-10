import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "Invalid payload: orderedIds must be an array of task ID strings." },
        { status: 400 }
      );
    }

    if (orderedIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 1. Verify ownership of all task IDs
    const userTasks = await prisma.task.findMany({
      where: {
        id: { in: orderedIds },
        userId,
      },
      select: { id: true },
    });

    if (userTasks.length !== orderedIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found or access denied." },
        { status: 403 }
      );
    }

    // 2. Perform updates in a single transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.task.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true, count: orderedIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
