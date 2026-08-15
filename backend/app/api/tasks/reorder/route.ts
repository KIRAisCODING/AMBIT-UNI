import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 1. Verify ownership of all task items
    const items = await prisma.inboxItem.findMany({
      where: {
        id: { in: orderedIds },
        userId,
      },
      include: {
        task: true,
      },
    });

    if (items.length !== orderedIds.length) {
      return NextResponse.json({ error: "Forbidden or Not Found" }, { status: 403 });
    }

    // 2. Perform updates in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.task.update({
          where: { inboxItemId: id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
