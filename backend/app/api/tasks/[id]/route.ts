import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority } from "@prisma/client";
import { verifyAndNormalizeTaskHierarchy } from "@/lib/verifyHierarchy";
import { isValidDateOnly, parseISODateTime } from "@/lib/dateUtils";
import { mapTaskToResponse } from "../route";
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

    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(mapTaskToResponse(task));
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

    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
      include: { tags: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    // 1. Title
    if (body.title !== undefined || body.content !== undefined) {
      const rawTitle = String(body.title !== undefined ? body.title : body.content).trim();
      if (!rawTitle) {
        return NextResponse.json({ error: "Task title must not be empty" }, { status: 400 });
      }
      updateData.title = rawTitle;
    }

    // 2. Description
    if (body.description !== undefined) {
      updateData.description = body.description === null ? null : String(body.description);
    }

    // 3. Status & CompletedAt transitions (Decision 07)
    let newStatus: TaskStatus | undefined;
    if (body.status !== undefined) {
      const sUpper = String(body.status).toUpperCase();
      if (sUpper === "DONE" || sUpper === "COMPLETED") {
        newStatus = TaskStatus.COMPLETED;
      } else if (sUpper in TaskStatus) {
        newStatus = sUpper as TaskStatus;
      }
    } else if (body.completed !== undefined) {
      newStatus = body.completed ? TaskStatus.COMPLETED : TaskStatus.TODO;
    }

    if (newStatus !== undefined) {
      updateData.status = newStatus;
      if (newStatus === TaskStatus.COMPLETED) {
        updateData.completedAt = existingTask.completedAt || new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    // 4. Priority
    if (body.priority !== undefined) {
      const pUpper = String(body.priority).toUpperCase();
      if (pUpper in Priority) {
        updateData.priority = pUpper as Priority;
      }
    }

    // 5. DueDate (Changing dueDate never modifies scheduledDate)
    if (body.dueDate !== undefined || body.deadline !== undefined) {
      const rawDate = body.dueDate !== undefined ? body.dueDate : body.deadline;
      if (rawDate === null || rawDate === "") {
        updateData.dueDate = null;
      } else {
        try {
          updateData.dueDate = parseISODateTime(rawDate);
        } catch (err: any) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
      }
    }

    // 6. ScheduledDate (Changing scheduledDate never modifies dueDate)
    if (body.scheduledDate !== undefined) {
      if (body.scheduledDate === null || body.scheduledDate === "") {
        updateData.scheduledDate = null;
      } else {
        if (!isValidDateOnly(body.scheduledDate)) {
          return NextResponse.json(
            { error: `Invalid scheduledDate: "${body.scheduledDate}". Expected YYYY-MM-DD.` },
            { status: 400 }
          );
        }
        updateData.scheduledDate = body.scheduledDate;
      }
    }

    // 7. Order
    if (typeof body.order === "number") {
      updateData.order = body.order;
    }

    // 8. Hierarchy update & normalization (Decision 02 & 07)
    const hasHierarchyInput =
      body.areaId !== undefined ||
      body.projectId !== undefined ||
      body.subProjectId !== undefined ||
      body.area !== undefined ||
      body.project !== undefined ||
      body.subProject !== undefined;

    if (hasHierarchyInput) {
      let areaId = body.areaId !== undefined ? body.areaId : existingTask.areaId;
      let projectId = body.projectId !== undefined ? body.projectId : existingTask.projectId;
      let subProjectId = body.subProjectId !== undefined ? body.subProjectId : existingTask.subProjectId;

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

    // 9. Tags update
    if (Array.isArray(body.tags)) {
      const tagNames: string[] = body.tags
        .filter((t: any) => typeof t === "string" && t.trim())
        .map((t: string) => t.trim().toLowerCase());

      const tagConnectors = [];
      for (const name of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
        });
        tagConnectors.push({ id: tag.id });
      }
      updateData.tags = { set: tagConnectors };
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
    });

    return NextResponse.json(mapTaskToResponse(updatedTask));
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

    const task = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete task (historical promoted Captures remain intact)
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
