import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const limit = 20;

  const where: Record<string, unknown> = { authorId: userId };

  // Only show published articles to other users
  if (status === "DRAFT") {
    where.status = "DRAFT";
  } else {
    where.status = "PUBLISHED";
  }

  const articles = await prisma.article.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      status: true,
      viewCount: true,
      likeCount: true,
      createdAt: true,
      updatedAt: true,
      isAiGenerated: true,
      perspective: {
        select: { id: true, name: true, slug: true, color: true },
      },
      author: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, limit) : articles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
