import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "default-settings" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "default-settings",
          userName: "Senior Product Designer",
          userEmail: "architect@ambit.ai",
          theme: "light",
          dailyReviewReminder: true,
          streakAlerts: true,
          calendarSync: false,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = await prisma.settings.upsert({
      where: { id: "default-settings" },
      update: {
        userName: body.userName,
        userEmail: body.userEmail,
        theme: body.theme,
        dailyReviewReminder: body.dailyReviewReminder,
        streakAlerts: body.streakAlerts,
        calendarSync: body.calendarSync,
      },
      create: {
        id: "default-settings",
        userName: body.userName || "Senior Product Designer",
        userEmail: body.userEmail || "architect@ambit.ai",
        theme: body.theme || "light",
        dailyReviewReminder: body.dailyReviewReminder ?? true,
        streakAlerts: body.streakAlerts ?? true,
        calendarSync: body.calendarSync ?? false,
      },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
