import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { mapNoteToResponse } from "@/lib/noteUtils";
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

    const existingNote = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let newPinned = !existingNote.pinned; // Toggle by default
    if (body.pinned !== undefined) {
      newPinned = Boolean(body.pinned);
    } else if (body.isPinned !== undefined) {
      newPinned = Boolean(body.isPinned);
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { pinned: newPinned },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      pinned: updated.pinned,
      isPinned: updated.pinned,
      note: mapNoteToResponse(updated),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

