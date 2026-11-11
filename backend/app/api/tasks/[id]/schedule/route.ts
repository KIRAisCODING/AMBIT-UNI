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
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let newScheduledDate: string | null = null;

    if (body.scheduledDate !== undefined) {
      if (body.scheduledDate === null || body.scheduledDate === "") {
        newScheduledDate = null;
      } else {
        if (!isValidDateOnly(body.scheduledDate)) {
          return NextResponse.json(
            { error: `Invalid scheduledDate: "${body.scheduledDate}". Expected YYYY-MM-DD.` },
            { status: 400 }
          );
        }
        newScheduledDate = body.scheduledDate;
      }
    } else {
      return NextResponse.json(
        { error: "scheduledDate field is required in request body." },
        { status: 400 }
      );
    }

    // Update scheduledDate strictly leaving dueDate untouched (Decision 07 & 10)
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        scheduledDate: newScheduledDate,
      },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json(mapTaskToResponse(updatedTask));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
