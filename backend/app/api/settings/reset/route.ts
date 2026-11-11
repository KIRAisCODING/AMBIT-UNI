import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import {
  TaskStatus,
  HabitFrequency,
  Priority,
  CaptureStatus,
  ProjectStatus,
} from "@prisma/client";
import { getUserLocalToday, addDaysToDateOnly } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload. Expected JSON body with action and confirm." },
        { status: 400 }
      );
    }

    const { action, confirm } = body;

    // 1. Explicit Action Validation (Rejects missing, malformed, or unrecognized actions)
    if (!action || typeof action !== "string" || !["clear", "seed"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid or missing action. Expected "clear" or "seed".' },
        { status: 400 }
      );
    }

    // 2. Explicit Confirmation Required (Rejects unconfirmed destructive requests)
    if (confirm !== true) {
      return NextResponse.json(
        { error: "Explicit confirmation required. Please provide confirm: true to proceed with reset." },
        { status: 400 }
      );
    }

    // 3. Transactional Reverse-Dependency Deletion
    // Clears user application data while strictly preserving User, Account, Session, and Settings
    await prisma.$transaction([
      prisma.habitLog.deleteMany({ where: { userId } }),
      prisma.task.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.capture.deleteMany({ where: { userId } }),
      prisma.habit.deleteMany({ where: { userId } }),
      prisma.subProject.deleteMany({ where: { userId } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.area.deleteMany({ where: { userId } }),
      prisma.tag.deleteMany({ where: { userId } }),
    ]);

    if (action === "seed") {
      const todayStr = getUserLocalToday("UTC");
      const yesterdayStr = addDaysToDateOnly(todayStr, -1);
      const twoDaysAgoStr = addDaysToDateOnly(todayStr, -2);
      const threeDaysAgoStr = addDaysToDateOnly(todayStr, -3);
      const fourDaysAgoStr = addDaysToDateOnly(todayStr, -4);

      // 2. Seed Areas with Nested Projects & SubProjects
      const areaWork = await prisma.area.create({
        data: {
          name: "Work",
          icon: "Briefcase",
          order: 1,
          userId,
          projects: {
            create: [
              {
                name: "Product Launch",
                order: 1,
                status: ProjectStatus.ACTIVE,
                userId,
                subProjects: {
                  create: [
                    { name: "Backend", order: 1, userId },
                    { name: "Frontend", order: 2, userId },
                    { name: "Database", order: 3, userId },
                    { name: "QA Testing", order: 4, userId },
                  ],
                },
              },
              {
                name: "Home Office",
                order: 2,
                status: ProjectStatus.ACTIVE,
                userId,
                subProjects: {
                  create: [
                    { name: "Layout Planning", order: 1, userId },
                    { name: "Acoustics", order: 2, userId },
                    { name: "Ergonomics", order: 3, userId },
                  ],
                },
              },
            ],
          },
        },
      });

      const areaPersonal = await prisma.area.create({
        data: {
          name: "Personal",
          icon: "User",
          order: 2,
          userId,
          projects: {
            create: [
              {
                name: "Health & Fitness",
                order: 1,
                status: ProjectStatus.ACTIVE,
                userId,
                subProjects: {
                  create: [
                    { name: "Workout Routines", order: 1, userId },
                    { name: "Diet Plan", order: 2, userId },
                    { name: "Sleep Tracker", order: 3, userId },
                  ],
                },
              },
            ],
          },
        },
      });

      const areaEducation = await prisma.area.create({
        data: {
          name: "Education",
          icon: "GraduationCap",
          order: 3,
          userId,
          projects: {
            create: [
              {
                name: "Semester 5",
                order: 1,
                status: ProjectStatus.ACTIVE,
                userId,
                subProjects: {
                  create: [
                    { name: "DBMS", order: 1, userId },
                    { name: "Computer Networks", order: 2, userId },
                    { name: "Software Engineering", order: 3, userId },
                  ],
                },
              },
            ],
          },
        },
      });

      const areaSideProjects = await prisma.area.create({
        data: {
          name: "Side Projects",
          icon: "Rocket",
          order: 4,
          userId,
          projects: {
            create: [
              {
                name: "App Design",
                order: 1,
                status: ProjectStatus.ACTIVE,
                userId,
                subProjects: {
                  create: [
                    { name: "Figma Drafts", order: 1, userId },
                    { name: "User Testing", order: 2, userId },
                    { name: "Visual Style", order: 3, userId },
                  ],
                },
              },
            ],
          },
        },
      });

      // 3. Resolve Project & SubProject IDs for Task & Note Associations
      const workProj = await prisma.project.findFirst({
        where: { name: "Product Launch", areaId: areaWork.id, userId },
      });
      const workSubDB = await prisma.subProject.findFirst({
        where: { name: "Database", projectId: workProj?.id, userId },
      });
      const workSubBE = await prisma.subProject.findFirst({
        where: { name: "Backend", projectId: workProj?.id, userId },
      });

      const homeOfficeProj = await prisma.project.findFirst({
        where: { name: "Home Office", areaId: areaWork.id, userId },
      });
      const homeOfficeAcoustics = await prisma.subProject.findFirst({
        where: { name: "Acoustics", projectId: homeOfficeProj?.id, userId },
      });

      // 4. Seed Global Tags
      await prisma.tag.createMany({
        data: [
          { name: "Urgent", color: "#EF4444", userId },
          { name: "Design", color: "#8B5CF6", userId },
          { name: "Engineering", color: "#3B82F6", userId },
          { name: "Health", color: "#10B981", userId },
        ],
      });

      // 5. Seed First-Class Tasks (Normalized Hierarchy - Decisions 01, 02, 05, 07)
      await prisma.task.create({
        data: {
          title: "Design the database schema for the product launch backend including indices for user querying",
          description: "Define entities, relationships, foreign keys, and perform query plan analysis.",
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          subProjectId: workSubDB?.id,
          scheduledDate: todayStr,
          dueDate: new Date(Date.now() + 24 * 3600000), // Tomorrow
          userId,
        },
      });

      await prisma.task.create({
        data: {
          title: "Implement lightweight JWT session authentication token middleware inside express server",
          description: "Verify tokens on incoming API requests with automatic rotation.",
          status: TaskStatus.COMPLETED,
          priority: Priority.MEDIUM,
          subProjectId: workSubBE?.id,
          completedAt: new Date(Date.now() - 24 * 3600000), // Yesterday
          userId,
        },
      });

      await prisma.task.create({
        data: {
          title: "Review pull requests and run unit test suite",
          description: "Verify regression coverage and clean architectural boundaries.",
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          projectId: workProj?.id,
          scheduledDate: todayStr,
          userId,
        },
      });

      await prisma.task.create({
        data: {
          title: "Set up acoustic panels on studio rear wall",
          description: "Dampen high frequency flutter echoes for cleaner audio recordings.",
          status: TaskStatus.TODO,
          priority: Priority.LOW,
          subProjectId: homeOfficeAcoustics?.id,
          userId,
        },
      });

      await prisma.task.create({
        data: {
          title: "Quarterly tax planning and invoice reconciliation",
          description: "Review receipts, export invoices, and prepare estimated quarterly filing.",
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          userId, // Unassigned standalone task
        },
      });

      // 6. Seed First-Class Notes (Decisions 01, 08)
      await prisma.note.create({
        data: {
          title: "Typography & Visual Identity Guidelines",
          content: "Spoke with the product team today. They want a cleaner, Hanken Grotesk-based bold displaying typography for the stats dashboards and minimal spacing.",
          pinned: true,
          projectId: workProj?.id,
          userId,
        },
      });

      await prisma.note.create({
        data: {
          title: "Morning Reflections",
          content: "Morning reflections: Feeling highly focused today. Intentionally keeping layout distractions and social notifications muted to maintain deep research.",
          pinned: false,
          areaId: areaPersonal.id,
          userId,
        },
      });

      await prisma.note.create({
        data: {
          title: "Local-First Architecture Ideas",
          content: "Explore local-first sync engines, CRDT primitives, and operational transformation algorithms.",
          pinned: false,
          userId, // Unassigned standalone note
        },
      });

      // 7. Seed Unprocessed Captures (Decision 03)
      await prisma.capture.create({
        data: {
          content: "Build a mobile companion shortcut or widget for instantly capturing notes from the Android notification bar without opening the browser",
          status: CaptureStatus.INBOX,
          userId,
        },
      });

      await prisma.capture.create({
        data: {
          content: "Explore CRDT algorithms for multi-device sync conflict resolution",
          status: CaptureStatus.INBOX,
          userId,
        },
      });

      // 8. Seed Habits & Normalized HabitLog Records (Decisions 01, 09)
      const habit1 = await prisma.habit.create({
        data: {
          name: "Meditate for 10 minutes",
          description: "Focus on breathing and mental clarity. Best done in the morning.",
          frequency: HabitFrequency.DAILY,
          areaId: areaPersonal.id,
          userId,
        },
      });

      const habit2 = await prisma.habit.create({
        data: {
          name: "Review captured external brain entries",
          description: "Go through Inbox and either complete, assign or schedule raw ideas.",
          frequency: HabitFrequency.DAILY,
          areaId: areaWork.id,
          userId,
        },
      });

      const habit3 = await prisma.habit.create({
        data: {
          name: "Strength Training",
          description: "Compound barbell movements and mobility drills.",
          frequency: HabitFrequency.WEEKLY,
          targetDaysPerWeek: 4,
          areaId: areaPersonal.id,
          userId,
        },
      });

      const habit4 = await prisma.habit.create({
        data: {
          name: "Read 15 pages of technical book",
          description: 'Currently reading "Designing Data-Intensive Applications".',
          frequency: HabitFrequency.DAILY,
          userId, // Standalone habit
        },
      });

      // Create HabitLog entries for dynamic streak engine
      await prisma.habitLog.createMany({
        data: [
          // Habit 1: 3-day streak (2 days ago, yesterday, today)
          { habitId: habit1.id, userId, date: twoDaysAgoStr },
          { habitId: habit1.id, userId, date: yesterdayStr },
          { habitId: habit1.id, userId, date: todayStr },

          // Habit 2: 4-day streak (4, 3, 2 days ago, yesterday)
          { habitId: habit2.id, userId, date: fourDaysAgoStr },
          { habitId: habit2.id, userId, date: threeDaysAgoStr },
          { habitId: habit2.id, userId, date: twoDaysAgoStr },
          { habitId: habit2.id, userId, date: yesterdayStr },

          // Habit 3: Weekly habit logs (yesterday, 3 days ago)
          { habitId: habit3.id, userId, date: threeDaysAgoStr },
          { habitId: habit3.id, userId, date: yesterdayStr },

          // Habit 4: Standalone daily habit log (today)
          { habitId: habit4.id, userId, date: todayStr },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message:
        action === "seed"
          ? "Database reset and seeded successfully"
          : "Database cleared successfully",
    });
  } catch (error: any) {
    console.error("Settings reset error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resetting settings data." },
      { status: 500 }
    );
  }
}
