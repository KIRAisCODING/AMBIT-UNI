import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const areas = await prisma.area.findMany();

  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const body = await req.json();

  const area = await prisma.area.create({
    data: {
      name: body.name,
    },
  });

  return NextResponse.json(area);
}