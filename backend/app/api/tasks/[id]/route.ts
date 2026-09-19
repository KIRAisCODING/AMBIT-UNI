import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyHierarchy } from "@/lib/verifyHierarchy";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;
  const userId = session.user.id;
  const { id } = await params;

  // Verify ownership of the inbox item
  const existingItem = await prisma.inboxItem.findFirst({
    where: { id, userId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  await prisma.task.deleteMany({
    where: {
      inboxItemId: id,
      userId,
    },
  });

  await prisma.inboxItem.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({
    success: true,
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;
  const userId = session.user.id;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      inboxItemId: id,
      userId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;
  const userId = session.user.id;
  const { id } = await params;

  // Verify ownership of the inbox item
  const existingItem = await prisma.inboxItem.findFirst({
    where: { id, userId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const body = await req.json();

  // Check if any inboxItem fields are being updated
  const inboxUpdates: any = {};
  if (body.content !== undefined) inboxUpdates.content = body.content;
  if (body.type !== undefined) inboxUpdates.type = body.type;
  if (body.tags !== undefined) {
    inboxUpdates.tags = Array.isArray(body.tags)
      ? body.tags.filter((t: any) => typeof t === "string" && t.trim()).map((t: string) => t.trim())
      : [];
  }

  // Hierarchy update handling
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
    inboxUpdates.assigned = Boolean(targetAreaId || targetProjectId || targetSubProjectId);
  }

  if (Object.keys(inboxUpdates).length > 0) {
    await prisma.inboxItem.update({
      where: { id },
      data: inboxUpdates,
    });
  }

  const existingTask = await prisma.task.findUnique({
    where: { inboxItemId: id },
  });

  let completedAt = null;
  if (body.completed) {
    completedAt = existingTask?.completed ? existingTask.completedAt : new Date();
  }

  const task = await prisma.task.upsert({
    where: {
      inboxItemId: id,
    },
    update: {
      description: body.description !== undefined ? body.description : (body.content !== undefined ? body.content : undefined),
      deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
      completed: body.completed !== undefined ? body.completed : undefined,
      completedAt: body.completed !== undefined ? completedAt : undefined,
    },
    create: {
      inboxItemId: id,
      description: body.description || body.content || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: body.completed || false,
      completedAt,
      userId,
    },
  });

  const updatedInboxItem = await prisma.inboxItem.findUnique({
    where: { id },
  });

  let areaName = null;
  let projectName = null;
  let subProjectName = null;
  if (updatedInboxItem?.areaId) {
    const a = await prisma.area.findUnique({ where: { id: updatedInboxItem.areaId } });
    if (a) areaName = a.name;
  }
  if (updatedInboxItem?.projectId) {
    const p = await prisma.project.findUnique({ where: { id: updatedInboxItem.projectId } });
    if (p) projectName = p.name;
  }
  if (updatedInboxItem?.subProjectId) {
    const sp = await prisma.subProject.findUnique({ where: { id: updatedInboxItem.subProjectId } });
    if (sp) subProjectName = sp.name;
  }

  return NextResponse.json({
    ...updatedInboxItem,
    tags: Array.isArray(updatedInboxItem?.tags) ? updatedInboxItem.tags : [],
    area: areaName,
    project: projectName,
    subProject: subProjectName,
    task,
  });
}
