import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "clear"; // "clear" or "seed"

    // Transaction to clear everything
    await prisma.$transaction([
      prisma.task.deleteMany(),
      prisma.inboxItem.deleteMany(),
      prisma.habit.deleteMany(),
      prisma.subProject.deleteMany(),
      prisma.project.deleteMany(),
      prisma.area.deleteMany(),
    ]);

    if (action === "seed") {
      // 1. Seed Areas, Projects, SubProjects
      const areaWork = await prisma.area.create({
        data: {
          name: "Work",
          projects: {
            create: [
              {
                name: "Product Launch",
                subProjects: {
                  create: [
                    { name: "Backend" },
                    { name: "Frontend" },
                    { name: "Database" },
                    { name: "QA Testing" },
                  ],
                },
              },
              {
                name: "Home Office",
                subProjects: {
                  create: [
                    { name: "Layout Planning" },
                    { name: "Acoustics" },
                    { name: "Ergonomics" },
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
          projects: {
            create: [
              {
                name: "Health & Fitness",
                subProjects: {
                  create: [
                    { name: "Workout Routines" },
                    { name: "Diet Plan" },
                    { name: "Sleep Tracker" },
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
          projects: {
            create: [
              {
                name: "Semester 5",
                subProjects: {
                  create: [
                    { name: "DBMS" },
                    { name: "Computer Networks" },
                    { name: "Software Engineering" },
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
          projects: {
            create: [
              {
                name: "App Design",
                subProjects: {
                  create: [
                    { name: "Figma Drafts" },
                    { name: "User Testing" },
                    { name: "Visual Style" },
                  ],
                },
              },
            ],
          },
        },
      });

      // Fetch created hierarchy entities to resolve IDs for tasks and habits
      const workProj = await prisma.project.findFirst({
        where: { name: "Product Launch", areaId: areaWork.id },
      });
      const workSubDB = await prisma.subProject.findFirst({
        where: { name: "Database", projectId: workProj?.id },
      });
      const workSubFE = await prisma.subProject.findFirst({
        where: { name: "Frontend", projectId: workProj?.id },
      });
      const workSubBE = await prisma.subProject.findFirst({
        where: { name: "Backend", projectId: workProj?.id },
      });

      const personalProj = await prisma.project.findFirst({
        where: { name: "Health & Fitness", areaId: areaPersonal.id },
      });

      const sideProj = await prisma.project.findFirst({
        where: { name: "App Design", areaId: areaSideProjects.id },
      });
      const sideSubBE = await prisma.subProject.findFirst({
        where: { name: "Backend", projectId: sideProj?.id },
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
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item1.id,
          completed: false,
        },
      });

      const item2 = await prisma.inboxItem.create({
        data: {
          content: "Use vector embeddings via Gemini-embedding-2 to automatically cluster related thoughts in the AMBIT canvas",
          type: "Idea",
          assigned: true,
          areaId: areaSideProjects.id,
          projectId: sideProj?.id,
          subProjectId: sideSubBE?.id,
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
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item3.id,
          deadline: new Date(),
          completed: false,
        },
      });

      const item4 = await prisma.inboxItem.create({
        data: {
          content: "Morning reflections: Feeling highly focused today. Intentionally keeping layout distractions and social notifications muted to maintain deep research.",
          type: "Journal",
          assigned: true,
          areaId: areaPersonal.id,
          projectId: personalProj?.id,
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item4.id,
          deadline: new Date(),
          completed: false,
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
        },
      });
      await prisma.task.create({
        data: {
          inboxItemId: item5.id,
          deadline: new Date(Date.now() - 24 * 3600000), // Yesterday
          completed: true,
        },
      });

      await prisma.inboxItem.create({
        data: {
          content: "Build a mobile companion shortcut or widget for instantly capturing notes from the Android notification bar without opening the browser",
          type: "Idea",
          assigned: false,
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
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
