import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const perspectiveSlug = searchParams.get("perspective");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(ITEMS_PER_PAGE)),
    50
  );

  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    topic: { status: "PUBLISHED" },
  };

  if (perspectiveSlug) {
    where.perspective = { slug: perspectiveSlug };
  }

  const articles = await prisma.article.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      summary: true,
      imageUrl: true,
      viewCount: true,
      likeCount: true,
      createdAt: true,
      perspective: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          color: true,
        },
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
  });

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, limit) : articles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
