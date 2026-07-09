import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action || "clear"; // "clear" or "seed"

    // Transaction to clear everything belonging to user
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { userId } }),
      prisma.inboxItem.deleteMany({ where: { userId } }),
      prisma.habit.deleteMany({ where: { userId } }),
      prisma.subProject.deleteMany({ where: { userId } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.area.deleteMany({ where: { userId } }),
    ]);

    if (action === "seed") {
      // 1. Seed Areas, Projects, SubProjects for this user
      const areaWork = await prisma.area.create({
        data: {
          name: "Work",
          userId,
          projects: {
            create: [
              {
                name: "Product Launch",
                userId,
                subProjects: {
                  create: [
                    { name: "Backend", userId },
                    { name: "Frontend", userId },
                    { name: "Database", userId },
                    { name: "QA Testing", userId },
                  ],
                },
              },
              {
                name: "Home Office",
                userId,
                subProjects: {
                  create: [
                    { name: "Layout Planning", userId },
                    { name: "Acoustics", userId },
                    { name: "Ergonomics", userId },
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
          userId,
          projects: {
            create: [
              {
                name: "Health & Fitness",
                userId,
                subProjects: {
                  create: [
                    { name: "Workout Routines", userId },
                    { name: "Diet Plan", userId },
                    { name: "Sleep Tracker", userId },
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
          userId,
          projects: {
            create: [
              {
                name: "Semester 5",
                userId,
                subProjects: {
                  create: [
                    { name: "DBMS", userId },
                    { name: "Computer Networks", userId },
                    { name: "Software Engineering", userId },
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
          userId,
          projects: {
            create: [
              {
                name: "App Design",
                userId,
                subProjects: {
                  create: [
                    { name: "Figma Drafts", userId },
                    { name: "User Testing", userId },
                    { name: "Visual Style", userId },
                  ],
                },
              },
            ],
          },
        },
      });

      // Fetch created hierarchy entities to resolve IDs for tasks and habits
      const workProj = await prisma.project.findFirst({
        where: { name: "Product Launch", areaId: areaWork.id, userId },
      });
      const workSubDB = await prisma.subProject.findFirst({
        where: { name: "Database", projectId: workProj?.id, userId },
      });
      const workSubFE = await prisma.subProject.findFirst({
        where: { name: "Frontend", projectId: workProj?.id, userId },
      });
      const workSubBE = await prisma.subProject.findFirst({
        where: { name: "Backend", projectId: workProj?.id, userId },
      });

      const personalProj = await prisma.project.findFirst({
        where: { name: "Health & Fitness", areaId: areaPersonal.id, userId },
      });

      const sideProj = await prisma.project.findFirst({
        where: { name: "App Design", areaId: areaSideProjects.id, userId },
      });
      const sideSubBE = await prisma.subProject.findFirst({
        where: { name: "Backend", projectId: sideProj?.id, userId },
      });

      // 2. Seed default items (tasks/notes/ideas)
      const item1 = await prisma.inboxItem.create({
        data: {
          content: "Design the database schema for the product launch backend including indices for user querying",
          type: "Task",
          assigned: true,
          areaId: areaWork.id,
          projectId: workProj?.id,
          subProjectId: workSubDB?.id,
          userId,
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item1.id,
          completed: false,
          userId,
        },
      });

      const item3 = await prisma.inboxItem.create({
        data: {
          content: "Spoke with the product team today. They want a cleaner, Hanken Grotesk-based bold displaying typography for the stats dashboards and minimal spacing.",
          type: "Note",
          assigned: true,
          areaId: areaWork.id,
          projectId: workProj?.id,
          subProjectId: workSubFE?.id,
          userId,
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item3.id,
          deadline: new Date(),
          completed: false,
          userId,
        },
      });

      const item4 = await prisma.inboxItem.create({
        data: {
          content: "Morning reflections: Feeling highly focused today. Intentionally keeping layout distractions and social notifications muted to maintain deep research.",
          type: "Journal",
          assigned: true,
          areaId: areaPersonal.id,
          projectId: personalProj?.id,
          userId,
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item4.id,
          deadline: new Date(),
          completed: false,
          userId,
        },
      });

      const item5 = await prisma.inboxItem.create({
        data: {
          content: "Implement the lightweight JWT session authentication token middleware inside express server",
          type: "Task",
          assigned: true,
          areaId: areaWork.id,
          projectId: workProj?.id,
          subProjectId: workSubBE?.id,
          userId,
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item5.id,
          deadline: new Date(Date.now() - 24 * 3600000), // Yesterday
          completed: true,
          userId,
        },
      });

      await prisma.inboxItem.create({
        data: {
          content: "Build a mobile companion shortcut or widget for instantly capturing notes from the Android notification bar without opening the browser",
          type: "Idea",
          assigned: false,
          userId,
        },
      });

      // 3. Seed Habits
      await prisma.habit.create({
        data: {
          name: "Meditate for 10 minutes",
          frequency: "daily",
          streak: 3,
          longestStreak: 12,
          completedDays: [
            new Date(Date.now() - 2 * 24 * 3600000).toISOString().split("T")[0],
            new Date(Date.now() - 24 * 3600000).toISOString().split("T")[0],
            new Date().toISOString().split("T")[0],
          ],
          notes: "Focus on breathing and mental clarity. Best done in the morning.",
          areaId: areaPersonal.id,
          projectId: personalProj?.id,
          userId,
        },
      });

      await prisma.habit.create({
        data: {
          name: "Review captured external brain entries",
          frequency: "daily",
          streak: 5,
          longestStreak: 15,
          completedDays: [
            new Date(Date.now() - 4 * 24 * 3600000).toISOString().split("T")[0],
            new Date(Date.now() - 3 * 24 * 3600000).toISOString().split("T")[0],
            new Date(Date.now() - 2 * 24 * 3600000).toISOString().split("T")[0],
            new Date(Date.now() - 24 * 3600000).toISOString().split("T")[0],
          ],
          notes: "Go through Inbox and either complete, assign or schedule raw ideas.",
          areaId: areaWork.id,
          projectId: workProj?.id,
          userId,
        },
      });

      await prisma.habit.create({
        data: {
          name: "Read 15 pages of technical book",
          frequency: "daily",
          streak: 1,
          longestStreak: 8,
          completedDays: [
            new Date().toISOString().split("T")[0],
          ],
          notes: 'Currently reading "Designing Data-Intensive Applications".',
          areaId: areaSideProjects.id,
          projectId: sideProj?.id,
          userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
