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

    const updated = await prisma.capture.update({
      where: { id },
      data: {
        status: CaptureStatus.TRASHED,
        trashedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      capture: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

