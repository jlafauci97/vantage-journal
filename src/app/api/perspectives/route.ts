import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const perspectives = await prisma.perspective.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { articles: true } },
    },
  });

  return NextResponse.json(perspectives);
}
