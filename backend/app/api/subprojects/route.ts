import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const projectId = searchParams.get("projectId");

  const subprojects = await prisma.subProject.findMany({
    where: {
      projectId: projectId || undefined,
    },
  });

  return NextResponse.json(subprojects);
}

export async function POST(req: Request) {
  const body = await req.json();

  const subproject = await prisma.subProject.create({
    data: {
      name: body.name,
      projectId: body.projectId,
    },
  });

  return NextResponse.json(subproject);
}