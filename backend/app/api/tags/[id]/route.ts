import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const existingTag = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete tag: join table references (_TaskTags, _NoteTags) are automatically disassociated
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

