import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ topics: [], articles: [] });
  }

  const searchTerm = `%${q}%`;

  const [topics, articles] = await Promise.all([
    prisma.topic.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { articles: true } },
        articles: {
          take: 5,
          select: {
            perspective: { select: { name: true, slug: true, color: true } },
          },
        },
      },
    }),
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        topic: { status: "PUBLISHED" },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { viewCount: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        imageUrl: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
        perspective: {
          select: { id: true, name: true, slug: true, category: true, color: true },
        },
        topic: {
          select: {
            id: true,
            title: true,
            slug: true,
            _count: { select: { articles: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ topics, articles });
}
