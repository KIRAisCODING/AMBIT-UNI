import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const subprojects = await prisma.subProject.findMany({
    where: {
      userId: session.user.id,
      projectId: projectId || undefined,
    },
  });

  return NextResponse.json(subprojects);
}

export async function POST(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const body = await req.json();

  // Validate that the project belongs to the user
  const project = await prisma.project.findFirst({
    where: { id: body.projectId, userId: session.user.id }
  });
  if (!project) {
    return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
  }

  const subproject = await prisma.subProject.create({
    data: {
      name: body.name,
      projectId: body.projectId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(subproject);
}