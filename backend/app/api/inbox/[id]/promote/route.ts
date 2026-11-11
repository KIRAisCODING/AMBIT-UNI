import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import {
  CaptureStatus,
  PromotedType,
  TaskStatus,
  Priority,
  HabitFrequency,
} from "@prisma/client";
import { verifyAndNormalizeTaskHierarchy, verifyHabitHierarchy } from "@/lib/verifyHierarchy";
import { isValidDateOnly, parseISODateTime } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let target = "";
  let captureId = "";
  let userId = "";

  async function resolveExistingPromoted(currentCapture: any) {
    if (currentCapture.promotedType === target && currentCapture.promotedId) {
      if (target === "TASK") {
        const existingTask = await prisma.task.findUnique({
          where: { id: currentCapture.promotedId },
          include: {
            area: true,
            project: { include: { area: true } },
            subProject: { include: { project: { include: { area: true } } } },
            tags: true,
          },
        });
        if (existingTask) {
          return NextResponse.json({
            success: true,
            alreadyPromoted: true,
            task: existingTask,
            capture: currentCapture,
          });
        }
      } else if (target === "NOTE") {
        const existingNote = await prisma.note.findUnique({
          where: { id: currentCapture.promotedId },
          include: { tags: true },
        });
        if (existingNote) {
          return NextResponse.json({
            success: true,
            alreadyPromoted: true,
            note: existingNote,
            capture: currentCapture,
          });
        }
      } else if (target === "HABIT") {
        const existingHabit = await prisma.habit.findUnique({
          where: { id: currentCapture.promotedId },
        });
        if (existingHabit) {
          return NextResponse.json({
            success: true,
            alreadyPromoted: true,
            habit: existingHabit,
            capture: currentCapture,
          });
        }
      }
    }
    return NextResponse.json(
      {
        error: `Capture has already been promoted to ${currentCapture.promotedType} (ID: ${currentCapture.promotedId})`,
      },
      { status: 409 }
    );
  }

  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    userId = session.user.id;
    const resolvedParams = await params;
    captureId = resolvedParams.id;

    // 1. Fetch capture and verify user ownership
    const capture = await prisma.capture.findFirst({
      where: { id: captureId, userId },
    });

    if (!capture) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    target = (body.target || "").toUpperCase();

    // Mandatory Correction A: Only support TASK, NOTE, HABIT
    if (target !== "TASK" && target !== "NOTE" && target !== "HABIT") {
      return NextResponse.json(
        {
          error:
            "Invalid promotion target. Only 'TASK', 'NOTE', and 'HABIT' are permitted.",
        },
        { status: 400 }
      );
    }

    // 2. Idempotency Check: if already promoted
    if (capture.status === CaptureStatus.PROMOTED) {
      return resolveExistingPromoted(capture);
    }

    // 3. Target: TASK
    if (target === "TASK") {
      const title = (body.title || capture.content).trim();
      if (!title) {
        return NextResponse.json(
          { error: "Task title must not be empty" },
          { status: 400 }
        );
      }

      // Hierarchy validation & normalization (Direct placement rule)
      const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
        areaId: body.areaId,
        projectId: body.projectId,
        subProjectId: body.subProjectId,
      });

      if (!hierarchyCheck.isValid) {
        return NextResponse.json(
          { error: hierarchyCheck.error },
          { status: 400 }
        );
      }

      // Date validation
      let dueDate: Date | null = null;
      if (body.dueDate) {
        try {
          dueDate = parseISODateTime(body.dueDate);
        } catch (err: any) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
      }

      let scheduledDate: string | null = null;
      if (body.scheduledDate) {
        if (!isValidDateOnly(body.scheduledDate)) {
          return NextResponse.json(
            { error: `Invalid scheduledDate format: ${body.scheduledDate}. Expected YYYY-MM-DD.` },
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
      }

      const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;

      // Tag handling
      const tagNames: string[] = Array.isArray(body.tags)
        ? body.tags
            .filter((t: any) => typeof t === "string" && t.trim())
            .map((t: string) => t.trim().toLowerCase())
        : [];

      // Atomic Transaction: Concurrency-Safe Status Claim & Task Creation
      const result = await prisma.$transaction(
        async (tx) => {
          // Atomic status claim: ensure exactly one transaction transitions capture out of INBOX
          const claim = await tx.capture.updateMany({
            where: { id: captureId, userId, status: CaptureStatus.INBOX },
            data: {
              status: CaptureStatus.PROMOTED,
              promotedType: PromotedType.TASK,
            },
          });

          if (claim.count === 0) {
            const err: any = new Error("ALREADY_PROMOTED_OR_CLAIMED");
            err.code = "CONCURRENCY_CLAIM_FAILED";
            throw err;
          }

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

          const task = await tx.task.create({
            data: {
              userId,
              title,
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

          const updatedCapture = await tx.capture.update({
            where: { id: captureId },
            data: {
              promotedId: task.id,
            },
          });

          return { task, capture: updatedCapture };
        },
        { maxWait: 10000, timeout: 20000 }
      );

      return NextResponse.json({
        success: true,
        task: result.task,
        capture: result.capture,
      });
    }

    // 4. Target: NOTE
    if (target === "NOTE") {
      const content = (body.content || capture.content).trim();
      const title = body.title ? String(body.title).trim() : null;

      const hierarchyCheck = await verifyAndNormalizeTaskHierarchy(userId, {
        areaId: body.areaId,
        projectId: body.projectId,
        subProjectId: body.subProjectId,
      });

      if (!hierarchyCheck.isValid) {
        return NextResponse.json(
          { error: hierarchyCheck.error },
          { status: 400 }
        );
      }

      const tagNames: string[] = Array.isArray(body.tags)
        ? body.tags
            .filter((t: any) => typeof t === "string" && t.trim())
            .map((t: string) => t.trim().toLowerCase())
        : [];

      // Atomic Transaction: Concurrency-Safe Status Claim & Note Creation
      const result = await prisma.$transaction(
        async (tx) => {
          // Atomic status claim
          const claim = await tx.capture.updateMany({
            where: { id: captureId, userId, status: CaptureStatus.INBOX },
            data: {
              status: CaptureStatus.PROMOTED,
              promotedType: PromotedType.NOTE,
            },
          });

          if (claim.count === 0) {
            const err: any = new Error("ALREADY_PROMOTED_OR_CLAIMED");
            err.code = "CONCURRENCY_CLAIM_FAILED";
            throw err;
          }

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

          const note = await tx.note.create({
            data: {
              userId,
              title,
              content,
              pinned: Boolean(body.pinned),
              areaId: hierarchyCheck.normalized.areaId,
              projectId: hierarchyCheck.normalized.projectId,
              subProjectId: hierarchyCheck.normalized.subProjectId,
              tags: tagConnectors.length > 0 ? { connect: tagConnectors } : undefined,
            },
            include: {
              tags: true,
            },
          });

          const updatedCapture = await tx.capture.update({
            where: { id: captureId },
            data: {
              promotedId: note.id,
            },
          });

          return { note, capture: updatedCapture };
        },
        { maxWait: 10000, timeout: 20000 }
      );

      return NextResponse.json({
        success: true,
        note: result.note,
        capture: result.capture,
      });
    }

    // 5. Target: HABIT
    if (target === "HABIT") {
      const name = (body.name || body.title || capture.content).trim().slice(0, 100);
      if (!name) {
        return NextResponse.json(
          { error: "Habit name must not be empty" },
          { status: 400 }
        );
      }

      // Habits can ONLY be assigned to an Area or remain standalone
      const habitHierarchyCheck = await verifyHabitHierarchy(
        userId,
        body.areaId,
        body.projectId,
        body.subProjectId
      );

      if (!habitHierarchyCheck.isValid) {
        return NextResponse.json(
          { error: habitHierarchyCheck.error },
          { status: 400 }
        );
      }

      const frequency: HabitFrequency =
        String(body.frequency).toUpperCase() === "WEEKLY"
          ? HabitFrequency.WEEKLY
          : HabitFrequency.DAILY;

      let targetDaysPerWeek: number | null = null;
      if (frequency === HabitFrequency.WEEKLY) {
        targetDaysPerWeek =
          typeof body.targetDaysPerWeek === "number" &&
          body.targetDaysPerWeek >= 1 &&
          body.targetDaysPerWeek <= 7
            ? Math.floor(body.targetDaysPerWeek)
            : 3;
      }

      // Atomic Transaction: Concurrency-Safe Status Claim & Habit Creation
      const result = await prisma.$transaction(
        async (tx) => {
          // Atomic status claim
          const claim = await tx.capture.updateMany({
            where: { id: captureId, userId, status: CaptureStatus.INBOX },
            data: {
              status: CaptureStatus.PROMOTED,
              promotedType: PromotedType.HABIT,
            },
          });

          if (claim.count === 0) {
            const err: any = new Error("ALREADY_PROMOTED_OR_CLAIMED");
            err.code = "CONCURRENCY_CLAIM_FAILED";
            throw err;
          }

          const habit = await tx.habit.create({
            data: {
              userId,
              name,
              description: body.description || null,
              frequency,
              targetDaysPerWeek,
              areaId: body.areaId || null,
            },
          });

          const updatedCapture = await tx.capture.update({
            where: { id: captureId },
            data: {
              promotedId: habit.id,
            },
          });

          return { habit, capture: updatedCapture };
        },
        { maxWait: 10000, timeout: 20000 }
      );

      return NextResponse.json({
        success: true,
        habit: result.habit,
        capture: result.capture,
      });
    }

    return NextResponse.json({ error: "Unsupported target" }, { status: 400 });
  } catch (error: any) {
    if (
      error.code === "CONCURRENCY_CLAIM_FAILED" ||
      error.code === "P2034" ||
      error.code === "P2028" ||
      error.message?.includes("write conflict") ||
      error.message?.includes("deadlock")
    ) {
      try {
        if (captureId && userId) {
          let latestCapture = await prisma.capture.findFirst({
            where: { id: captureId, userId },
          });

          // If the competing transaction is in the middle of assigning promotedId, wait briefly
          if (latestCapture && latestCapture.status === CaptureStatus.PROMOTED && !latestCapture.promotedId) {
            await new Promise((r) => setTimeout(r, 60));
            latestCapture = await prisma.capture.findFirst({
              where: { id: captureId, userId },
            });
          }

          if (latestCapture && latestCapture.status === CaptureStatus.PROMOTED) {
            return resolveExistingPromoted(latestCapture);
          }
        }
      } catch {
        // Fall through to 409
      }
      return NextResponse.json(
        { error: "Capture is currently being promoted or is no longer in inbox" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
