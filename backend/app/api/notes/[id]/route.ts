import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyAndNormalizeTaskHierarchy } from "@/lib/verifyHierarchy";
import { mapNoteToResponse } from "@/lib/noteUtils";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(mapNoteToResponse(note));
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

    const existingNote = await prisma.note.findFirst({
      where: { id, userId },
      include: { tags: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    // 1. Content update (Autosave support: does not wipe title or other fields)
    if (body.content !== undefined) {
      const rawContent = String(body.content);
      if (!rawContent.trim()) {
        return NextResponse.json(
          { error: "Note content must not be empty" },
          { status: 400 }
        );
      }
      updateData.content = rawContent;
    }

    // 2. Title update (optional; null or string)
    if (body.title !== undefined) {
      updateData.title =
        body.title === null || !String(body.title).trim()
          ? null
          : String(body.title).trim();
    }

    // 3. Pinning
    if (body.pinned !== undefined || body.isPinned !== undefined) {
      const pinVal = body.pinned !== undefined ? body.pinned : body.isPinned;
      updateData.pinned = Boolean(pinVal);
    }

    // 4. Archival
    if (body.archived !== undefined) {
      if (body.archived === true) {
        updateData.archivedAt = existingNote.archivedAt || new Date();
      } else {
        updateData.archivedAt = null;
      }
    } else if (body.archivedAt !== undefined) {
      updateData.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null;
    }

    // 5. Hierarchy update & direct placement normalization
    const hasHierarchyInput =
      body.areaId !== undefined ||
      body.projectId !== undefined ||
      body.subProjectId !== undefined ||
      body.area !== undefined ||
      body.project !== undefined ||
      body.subProject !== undefined;

    if (hasHierarchyInput) {
      let areaId = body.areaId !== undefined ? body.areaId : existingNote.areaId;
      let projectId = body.projectId !== undefined ? body.projectId : existingNote.projectId;
      let subProjectId = body.subProjectId !== undefined ? body.subProjectId : existingNote.subProjectId;

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

      const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
        areaId,
        projectId,
        subProjectId,
      });

      if (!hierarchyCheck.isValid) {
        return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
      }

      updateData.areaId = hierarchyCheck.normalized.areaId;
      updateData.projectId = hierarchyCheck.normalized.projectId;
      updateData.subProjectId = hierarchyCheck.normalized.subProjectId;
    }

    // 6. Tags update (Only updates if tags field is explicitly provided)
    if (Array.isArray(body.tags)) {
      const tagNames: string[] = body.tags
        .filter((t: any) => typeof t === "string" && t.trim())
        .map((t: string) => t.trim().toLowerCase());

      const tagConnectors = await Promise.all(
        tagNames.map((name) =>
          prisma.tag
            .upsert({
              where: { userId_name: { userId, name } },
              update: {},
              create: { userId, name },
            })
            .then((tag) => ({ id: tag.id }))
        )
      );
      updateData.tags = { set: tagConnectors };
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json(mapNoteToResponse(updatedNote));
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

    const existingNote = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
