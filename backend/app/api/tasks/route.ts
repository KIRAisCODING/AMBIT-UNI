import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority } from "@prisma/client";
import { verifyAndNormalizeTaskHierarchy } from "@/lib/verifyHierarchy";
import {
  isValidDateOnly,
  parseISODateTime,
  getUserLocalToday,
  addDaysToDateOnly,
  toUtcStartOfDay,
  toUtcEndOfDay,
} from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export function mapTaskToResponse(task: any) {
  const areaName =
    task.area?.name ||
    task.project?.area?.name ||
    task.subProject?.project?.area?.name ||
    null;
  const projectName =
    task.project?.name || task.subProject?.project?.name || null;
  const subProjectName = task.subProject?.name || null;

  const effectiveAreaId =
    task.areaId ||
    task.project?.areaId ||
    task.subProject?.project?.areaId ||
    null;
  const effectiveProjectId =
    task.projectId || task.subProject?.projectId || null;
  const effectiveSubProjectId = task.subProjectId || null;

  return {
    id: task.id,
    title: task.title,
    content: task.title, // Backward compatibility with legacy BrainItem
    description: task.description,
    status: task.status,
    completed: task.status === TaskStatus.COMPLETED, // Backward compatibility
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    scheduledDate: task.scheduledDate,
    order: task.order,
    areaId: effectiveAreaId,
    projectId: effectiveProjectId,
    subProjectId: effectiveSubProjectId,
    area: areaName,
    project: projectName,
    subProject: subProjectName,
    tags: Array.isArray(task.tags) ? task.tags.map((t: any) => t.name) : [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    type: "Task",
    assignment: effectiveAreaId || effectiveProjectId || effectiveSubProjectId ? "now" : "later",
  };
}

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get("areaId");
    const projectId = searchParams.get("projectId");
    const subProjectId = searchParams.get("subProjectId");
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const scheduledDate = searchParams.get("scheduledDate");
    const tag = searchParams.get("tag");
    const groupBy = searchParams.get("groupBy");
    const timeZone = searchParams.get("timeZone") || "UTC";

    const where: any = {
      userId,
      archivedAt: null,
    };

    if (subProjectId) {
      where.subProjectId = subProjectId;
    } else if (projectId) {
      where.projectId = projectId;
    } else if (areaId) {
      where.areaId = areaId;
    }

    if (statusParam) {
      const s = statusParam.toUpperCase();
      if (s === "DONE" || s === "COMPLETED") {
        where.status = TaskStatus.COMPLETED;
      } else if (s in TaskStatus) {
        where.status = s as TaskStatus;
      }
    }

    if (priorityParam) {
      const p = priorityParam.toUpperCase();
      if (p in Priority) {
        where.priority = p as Priority;
      }
    }

    if (scheduledDate) {
      where.scheduledDate = scheduledDate;
    }

    if (tag) {
      where.tags = {
        some: {
          name: tag.toLowerCase(),
        },
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        area: true,
        project: { include: { area: true } },
        subProject: { include: { project: { include: { area: true } } } },
        tags: true,
      },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });

    const mappedTasks = tasks.map(mapTaskToResponse);

    // Grouping by due date into 5 buckets (Decision 07)
    if (groupBy === "dueDate") {
      const userToday = getUserLocalToday(timeZone);
      const startOfToday = toUtcStartOfDay(userToday, timeZone);
      const endOfToday = toUtcEndOfDay(userToday, timeZone);
      const next7DaysStr = addDaysToDateOnly(userToday, 7);
      const endOfNext7Days = toUtcEndOfDay(next7DaysStr, timeZone);

      const overdue: any[] = [];
      const today: any[] = [];
      const next7Days: any[] = [];
      const later: any[] = [];
      const backlog: any[] = [];
      const completed: any[] = [];

      for (const t of mappedTasks) {
        if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) {
          completed.push(t);
          continue;
        }

        if (!t.dueDate) {
          backlog.push(t);
          continue;
        }

        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime < startOfToday.getTime()) {
          overdue.push(t);
        } else if (dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime()) {
          today.push(t);
        } else if (dueTime > endOfToday.getTime() && dueTime <= endOfNext7Days.getTime()) {
          next7Days.push(t);
        } else {
          later.push(t);
        }
      }

      return NextResponse.json({
        overdue,
        today,
        next7Days,
        later,
        backlog,
        completed,
        all: mappedTasks,
      });
    }

    return NextResponse.json(mappedTasks);
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
    const rawTitle = (body.title || body.content || "").trim();

    if (!rawTitle) {
      return NextResponse.json(
        { error: "Task title must not be empty" },
        { status: 400 }
      );
    }

    // Resolve name-based hierarchy if passed by legacy clients
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

    // Hierarchy validation & normalization (Direct placement rule: Decision 02 & 07)
    const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
      areaId,
      projectId,
      subProjectId,
    });

    if (!hierarchyCheck.isValid) {
      return NextResponse.json({ error: hierarchyCheck.error }, { status: 400 });
    }

    // Date validation: dueDate vs scheduledDate independence
    let dueDate: Date | null = null;
    const rawDueDate = body.dueDate || body.deadline || null;
    if (rawDueDate) {
      try {
        dueDate = parseISODateTime(rawDueDate);
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    let scheduledDate: string | null = null;
    if (body.scheduledDate) {
      if (!isValidDateOnly(body.scheduledDate)) {
        return NextResponse.json(
          { error: `Invalid scheduledDate: "${body.scheduledDate}". Expected YYYY-MM-DD representing a valid calendar date.` },
          { status: 400 }
        );
      }
      scheduledDate = body.scheduledDate;
    }

    // Priority mapping
    let priority: Priority = Priority.NONE;
    if (body.priority) {
      const pUpper = String(body.priority).toUpperCase();
      if (pUpper in Priority) {
        priority = pUpper as Priority;
      }
    }

    // Status mapping
    let status: TaskStatus = TaskStatus.TODO;
    if (body.status) {
      const sUpper = String(body.status).toUpperCase();
      if (sUpper === "DONE" || sUpper === "COMPLETED") {
        status = TaskStatus.COMPLETED;
      } else if (sUpper in TaskStatus) {
        status = sUpper as TaskStatus;
      }
    } else if (body.completed === true) {
      status = TaskStatus.COMPLETED;
    }

    const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;

    // Tags
    const tagNames: string[] = Array.isArray(body.tags)
      ? body.tags
          .filter((t: any) => typeof t === "string" && t.trim())
          .map((t: string) => t.trim().toLowerCase())
      : [];

    const task = await prisma.$transaction(
      async (tx) => {
        // Find highest order in target placement
        const maxTask = await tx.task.findFirst({
          where: {
            userId,
            areaId: hierarchyCheck.normalized.areaId,
            projectId: hierarchyCheck.normalized.projectId,
            subProjectId: hierarchyCheck.normalized.subProjectId,
          },
          orderBy: { order: "desc" },
        });
        const order = maxTask ? maxTask.order + 1 : 0;

        // Upsert tags concurrently
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

        return tx.task.create({
          data: {
            userId,
            title: rawTitle,
            description: body.description || null,
            status,
            priority,
            dueDate,
            scheduledDate,
            completedAt,
            order,
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

    return NextResponse.json(mapTaskToResponse(task), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
