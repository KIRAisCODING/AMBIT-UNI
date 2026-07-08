import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const areaId = searchParams.get("areaId");

  const projects = await prisma.project.findMany({
    where: {
      areaId: areaId || undefined,
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();

  const project = await prisma.project.create({
    data: {
      name: body.name,
      areaId: body.areaId,
    },
  });

  return NextResponse.json(project);
}