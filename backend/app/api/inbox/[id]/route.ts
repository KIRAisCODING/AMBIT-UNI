import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
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

    const item = await prisma.inboxItem.findFirst({
      where: { id, userId },
      include: { task: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(item);
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

    const existingItem = await prisma.inboxItem.findFirst({
      where: { id, userId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const body = await req.json();

    const inboxUpdates: any = {};
    if (body.content !== undefined) inboxUpdates.content = body.content;
    if (body.type !== undefined) inboxUpdates.type = body.type;
    if (body.assigned !== undefined) inboxUpdates.assigned = body.assigned;
    if (body.tags !== undefined) {
      inboxUpdates.tags = Array.isArray(body.tags)
        ? body.tags.filter((t: any) => typeof t === "string" && t.trim()).map((t: string) => t.trim())
        : [];
    }

    const hasHierarchyChange =
      body.areaId !== undefined ||
      body.projectId !== undefined ||
      body.subProjectId !== undefined ||
      body.area !== undefined ||
      body.project !== undefined ||
      body.subProject !== undefined;

    if (hasHierarchyChange) {
      let targetAreaId = body.areaId !== undefined ? (body.areaId || null) : existingItem.areaId;
      let targetProjectId = body.projectId !== undefined ? (body.projectId || null) : existingItem.projectId;
      let targetSubProjectId = body.subProjectId !== undefined ? (body.subProjectId || null) : existingItem.subProjectId;

      if (body.area !== undefined && !body.areaId) {
        if (body.area) {
          const a = await prisma.area.findFirst({ where: { name: body.area, userId } });
          targetAreaId = a ? a.id : null;
        } else {
          targetAreaId = null;
        }
      }

      if (body.project !== undefined && !body.projectId) {
        if (body.project) {
          const p = await prisma.project.findFirst({ where: { name: body.project, userId } });
          if (p) {
            targetProjectId = p.id;
          } else {
            return NextResponse.json({ error: "Project not found" }, { status: 400 });
          }
        } else {
          targetProjectId = null;
        }
      }

      if (body.subProject !== undefined && !body.subProjectId) {
        if (body.subProject) {
          const sp = await prisma.subProject.findFirst({ where: { name: body.subProject, userId } });
          if (sp) {
            targetSubProjectId = sp.id;
          } else {
            return NextResponse.json({ error: "SubProject not found" }, { status: 400 });
          }
        } else {
          targetSubProjectId = null;
        }
      }

      const hierarchyCheck = await verifyHierarchy(userId, targetAreaId, targetProjectId, targetSubProjectId);
      if (!hierarchyCheck.isValid) {
        return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
      }

      inboxUpdates.areaId = targetAreaId;
      inboxUpdates.projectId = targetProjectId;
      inboxUpdates.subProjectId = targetSubProjectId;
    }

    const updated = await prisma.inboxItem.update({
      where: { id },
      data: inboxUpdates,
    });

    return NextResponse.json(updated);
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

    const existingItem = await prisma.inboxItem.findFirst({
      where: { id, userId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.inboxItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
