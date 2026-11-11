import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { mapNoteToResponse } from "@/lib/noteUtils";
import { NextResponse } from "next/server";

export async function POST(
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
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        archivedAt: null,
      },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      archived: false,
      archivedAt: null,
      note: mapNoteToResponse(updated),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

