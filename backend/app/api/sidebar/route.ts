import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const userId = session.user.id;

    const areas = await prisma.area.findMany({
      where: {
        userId,
        archivedAt: includeArchived ? undefined : null,
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        projects: {
          where: {
            userId,
            archivedAt: includeArchived ? undefined : null,
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: {
            subProjects: {
              where: {
                userId,
                archivedAt: includeArchived ? undefined : null,
              },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    return NextResponse.json(areas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
