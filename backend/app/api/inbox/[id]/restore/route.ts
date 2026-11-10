import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { CaptureStatus } from "@prisma/client";
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

    const capture = await prisma.capture.findFirst({
      where: { id, userId },
    });

    if (!capture) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }

    if (capture.status !== CaptureStatus.TRASHED) {
      return NextResponse.json(
        { error: "Capture is not currently in trash" },
        { status: 400 }
      );
    }

    const restored = await prisma.capture.update({
      where: { id },
      data: {
        status: CaptureStatus.INBOX,
        trashedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      capture: restored,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

