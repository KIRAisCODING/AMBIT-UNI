import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyAndNormalizeTaskHierarchy } from "@/lib/verifyHierarchy";
import { mapNoteToResponse } from "@/lib/noteUtils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get("archived");
    const statusParam = searchParams.get("status")?.toLowerCase();
    const pinnedParam = searchParams.get("pinned");
    const areaId = searchParams.get("areaId");
    const projectId = searchParams.get("projectId");
    const subProjectId = searchParams.get("subProjectId");
    const tag = searchParams.get("tag");
    const q = searchParams.get("q");

    const where: any = {
      userId,
    };

    // 1. Archival filtering: Active notes by default unless archived requested
    if (archivedParam === "true" || statusParam === "archived") {
      where.archivedAt = { not: null };
    } else if (statusParam === "all") {
      // Return both active and archived
    } else {
      where.archivedAt = null;
    }

    // 2. Pin filter
    if (pinnedParam === "true") {
      where.pinned = true;
    } else if (pinnedParam === "false") {
      where.pinned = false;
    }

    // 3. Hierarchy filters
    const unassignedParam = searchParams.get("unassigned");
    const directParam = searchParams.get("direct");
    if (unassignedParam === "true") {
      where.areaId = null;
      where.projectId = null;
      where.subProjectId = null;
    } else if (subProjectId) {
      where.subProjectId = subProjectId;
    } else if (projectId) {
      if (directParam === "true") {
        where.projectId = projectId;
        where.subProjectId = null;
      } else {
        where.OR = [
          { projectId: projectId },
          { subProject: { projectId: projectId } },
        ];
      }
    } else if (areaId) {
      if (directParam === "true") {
        where.areaId = areaId;
        where.projectId = null;
        where.subProjectId = null;
      } else {
        where.OR = [
          { areaId: areaId },
          { project: { areaId: areaId } },
          { subProject: { project: { areaId: areaId } } },
        ];
      }
    }

    // 4. Tag filter
    if (tag) {
      where.tags = {
        some: {
          name: tag.toLowerCase().trim(),
        },
      };
    }

    // 5. Search query (title or content)
    if (q && q.trim()) {
      const keyword = q.trim();
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
      orderBy: [
        { pinned: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json(notes.map(mapNoteToResponse));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const rawContent = body.content !== undefined && body.content !== null ? String(body.content) : "";

    // Content is mandatory for a Note
    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json(
        { error: "Note content must not be empty" },
        { status: 400 }
      );
    }

    // Title is optional
    const title = body.title && String(body.title).trim() ? String(body.title).trim() : null;

    // Resolve name-based hierarchy if passed by legacy callers
    let areaId = body.areaId || null;
    let projectId = body.projectId || null;
    let subProjectId = body.subProjectId || null;

    if (!areaId && body.area) {
      const a = await prisma.area.findFirst({ where: { name: body.area, userId } });
      if (a) areaId = a.id;
    }
    if (!projectId && body.project) {
      const p = await prisma.project.findFirst({ where: { name: body.project, userId } });
      if (p) projectId = p.id;
    }
    if (!subProjectId && body.subProject) {
      const sp = await prisma.subProject.findFirst({ where: { name: body.subProject, userId } });
      if (sp) subProjectId = sp.id;
    }

    // Hierarchy validation & direct placement normalization (Decision 02 & 08)
    const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
      areaId,
      projectId,
      subProjectId,
    });

    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
    }

    // Pinning: default to false per approved specification
    const pinned = body.pinned === true || body.isPinned === true;

    // Tag handling
    const tagNames: string[] = Array.isArray(body.tags)
      ? body.tags
          .filter((t: any) => typeof t === "string" && t.trim())
          .map((t: string) => t.trim().toLowerCase())
      : [];

    const note = await prisma.$transaction(
      async (tx) => {
        const tagConnectors = await Promise.all(
          tagNames.map((name) =>
            tx.tag
              .upsert({
                where: { userId_name: { userId, name } },
                update: {},
                create: { userId, name },
              })
              .then((tag) => ({ id: tag.id }))
          )
        );

        return tx.note.create({
          data: {
            userId,
            title,
            content: rawContent,
            pinned,
            areaId: hierarchyCheck.normalized.areaId,
            projectId: hierarchyCheck.normalized.projectId,
            subProjectId: hierarchyCheck.normalized.subProjectId,
            tags: tagConnectors.length > 0 ? { connect: tagConnectors } : undefined,
          },
          include: {
            area: true,
            project: { include: { area: true } },
            subProject: { include: { project: { include: { area: true } } } },
            tags: true,
          },
        });
      },
      { timeout: 15000 }
    );

    return NextResponse.json(mapNoteToResponse(note), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
