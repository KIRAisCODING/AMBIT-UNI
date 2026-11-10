import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { CaptureStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status")?.toUpperCase();

    const where: any = {
      userId: session.user.id,
    };

    if (statusParam === "ALL") {
      // Return all captures
    } else if (statusParam === "TRASHED") {
      where.status = CaptureStatus.TRASHED;
    } else if (statusParam === "PROMOTED") {
      where.status = CaptureStatus.PROMOTED;
    } else {
      where.status = CaptureStatus.INBOX;
    }

    const captures = await prisma.capture.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Format for client with backwards-compatible attributes
    const mapped = captures.map((c) => ({
      id: c.id,
      content: c.content,
      rawContent: c.content,
      status: c.status,
      promotedType: c.promotedType,
      promotedId: c.promotedId,
      trashedAt: c.trashedAt,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      // Legacy compatibility
      type: "Task",
      assignment: "later",
      tags: [],
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const rawContent = (body.content || body.rawContent || "").trim();

    if (!rawContent) {
      return NextResponse.json(
        { error: "Content must not be empty" },
        { status: 400 }
      );
    }

    if (rawContent.length > 10000) {
      return NextResponse.json(
        { error: "Content exceeds maximum length of 10,000 characters" },
        { status: 400 }
      );
    }

    const capture = await prisma.capture.create({
      data: {
        userId: session.user.id,
        content: rawContent,
        status: CaptureStatus.INBOX,
      },
    });

    return NextResponse.json(
      {
        id: capture.id,
        content: capture.content,
        rawContent: capture.content,
        status: capture.status,
        promotedType: capture.promotedType,
        promotedId: capture.promotedId,
        trashedAt: capture.trashedAt,
        createdAt: capture.createdAt.toISOString(),
        updatedAt: capture.updatedAt.toISOString(),
        // Legacy compatibility
        type: "Task",
        assignment: "later",
        tags: [],
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
