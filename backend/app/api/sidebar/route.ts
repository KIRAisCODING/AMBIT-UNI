import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const areas = await prisma.area.findMany({
    include: {
      projects: {
        include: {
          subProjects: true,
        },
      },
    },
  });

  return NextResponse.json(areas);
}