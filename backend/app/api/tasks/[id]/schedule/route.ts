import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { isValidDateOnly } from "@/lib/dateUtils";
import { mapTaskToResponse } from "../../route";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let scheduledDate: string | null = null;

    if (body.scheduledDate !== undefined && body.scheduledDate !== null && body.scheduledDate !== "") {
      if (!isValidDateOnly(body.scheduledDate)) {
        return NextResponse.json(
          {
            error: `Invalid scheduledDate: "${body.scheduledDate}". Expected YYYY-MM-DD representing a valid calendar date.`,
          },
          { status: 400 }
        );
      }
      scheduledDate = body.scheduledDate;
    }

    // Update scheduledDate strictly. dueDate is completely untouched!
    const updated = await prisma.task.update({
      where: { id },
      data: { scheduledDate },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json(mapTaskToResponse(updated));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
