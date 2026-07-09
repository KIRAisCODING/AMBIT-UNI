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

    const areas = await prisma.area.findMany({
      where: { userId },
      include: {
        projects: {
          where: { userId },
          include: {
            subProjects: {
              where: { userId },
            },
          },
        },
      },
    });

    return NextResponse.json(areas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}