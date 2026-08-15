import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, errorResponse } = await authenticateAndRateLimit("read");
  if (errorResponse) return errorResponse;

  const areas = await prisma.area.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const { session, errorResponse } = await authenticateAndRateLimit("write");
  if (errorResponse) return errorResponse;

  const body = await req.json();

  const area = await prisma.area.create({
    data: {
      name: body.name,
      userId: session.user.id,
    },
  });

  return NextResponse.json(area);
}