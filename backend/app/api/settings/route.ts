import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          userName: session.user.name || "Senior Product Designer",
          userEmail: session.user.email || "architect@ambit.ai",
          theme: "light",
          dailyReviewReminder: true,
          streakAlerts: true,
          calendarSync: false,
          onboardingCompleted: false,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        userName: body.userName,
        userEmail: body.userEmail,
        theme: body.theme,
        dailyReviewReminder: body.dailyReviewReminder,
        streakAlerts: body.streakAlerts,
        calendarSync: body.calendarSync,
        onboardingCompleted: body.onboardingCompleted,
      },
      create: {
        userId,
        userName: body.userName || session.user.name || "Senior Product Designer",
        userEmail: body.userEmail || session.user.email || "architect@ambit.ai",
        theme: body.theme || "light",
        dailyReviewReminder: body.dailyReviewReminder ?? true,
        streakAlerts: body.streakAlerts ?? true,
        calendarSync: body.calendarSync ?? false,
        onboardingCompleted: body.onboardingCompleted ?? false,
      },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
