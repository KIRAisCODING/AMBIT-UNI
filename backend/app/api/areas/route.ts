import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const areas = await prisma.area.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const area = await prisma.area.create({
    data: {
      name: body.name,
      userId: session.user.id,
    },
  });

  return NextResponse.json(area);
}