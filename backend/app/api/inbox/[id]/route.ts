import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { CaptureStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const capture = await prisma.capture.findFirst({
      where: { id, userId },
    });

    if (!capture) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: capture.id,
      content: capture.content,
      rawContent: capture.content,
      status: capture.status,
      promotedType: capture.promotedType,
      promotedId: capture.promotedId,
      trashedAt: capture.trashedAt,
      createdAt: capture.createdAt.toISOString(),
      updatedAt: capture.updatedAt.toISOString(),
      type: "Task",
      assignment: "later",
      tags: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (body.content !== undefined || body.rawContent !== undefined) {
      const content = String(body.content || body.rawContent || "").trim();
      if (!content) {
        return NextResponse.json(
          { error: "Content must not be empty" },
          { status: 400 }
        );
      }
      updateData.content = content;
    }

    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase();
      if (s === "TRASHED") {
        updateData.status = CaptureStatus.TRASHED;
        updateData.trashedAt = new Date();
      } else if (s === "INBOX") {
        updateData.status = CaptureStatus.INBOX;
        updateData.trashedAt = null;
      }
    }

    const updated = await prisma.capture.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      rawContent: updated.content,
      status: updated.status,
      promotedType: updated.promotedType,
      promotedId: updated.promotedId,
      trashedAt: updated.trashedAt,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      type: "Task",
      assignment: "later",
      tags: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    // Capture must be in trash before permanent deletion
    if (capture.status !== CaptureStatus.TRASHED) {
      return NextResponse.json(
        {
          error:
            "Capture must be moved to trash before permanent deletion. Use PATCH /api/inbox/[id]/trash first.",
        },
        { status: 400 }
      );
    }

    // Enforce 30-day retention rule
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    const trashedAtTime = capture.trashedAt ? new Date(capture.trashedAt).getTime() : 0;
    const isRetentionExpired = Date.now() - trashedAtTime >= THIRTY_DAYS_MS;

    if (!isRetentionExpired && !force) {
      const daysRemaining = Math.max(
        1,
        Math.ceil((THIRTY_DAYS_MS - (Date.now() - trashedAtTime)) / (24 * 60 * 60 * 1000))
      );
      return NextResponse.json(
        {
          error: `Cannot permanently delete: Capture is protected by the 30-day retention policy (${daysRemaining} day(s) remaining). Use ?force=true to override.`,
          daysRemaining,
        },
        { status: 400 }
      );
    }

    await prisma.capture.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
