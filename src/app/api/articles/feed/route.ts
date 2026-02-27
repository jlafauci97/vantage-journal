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
    OR: [
      { topic: { status: "PUBLISHED" } },
      { topicId: null },
    ],
  };

  if (perspectiveSlug) {
    where.perspective = { slug: perspectiveSlug };
  }

  const articles = await prisma.article.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { viewCount: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      viewCount: true,
      likeCount: true,
      voteScore: true,
      repostCount: true,
      createdAt: true,
      isAiGenerated: true,
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
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, limit) : articles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
