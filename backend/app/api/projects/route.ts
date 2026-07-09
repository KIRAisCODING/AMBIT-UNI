import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const areaId = searchParams.get("areaId");

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      areaId: areaId || undefined,
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate that the area belongs to the user
  const area = await prisma.area.findFirst({
    where: { id: body.areaId, userId: session.user.id }
  });
  if (!area) {
    return NextResponse.json({ error: "Invalid Area ID" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: body.name,
      areaId: body.areaId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(project);
}