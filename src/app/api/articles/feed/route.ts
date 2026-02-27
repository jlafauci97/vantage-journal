import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/constants";

const articleSelect = {
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
  authorId: true,
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
  _count: {
    select: { comments: true },
  },
} as const;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const perspectiveSlug = searchParams.get("perspective");
  const mode = searchParams.get("mode"); // "following" or default (discover)
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(ITEMS_PER_PAGE)),
    50
  );

  const session = await auth();

  const baseWhere: Record<string, unknown> = {
    status: "PUBLISHED",
    OR: [
      { topic: { status: "PUBLISHED" } },
      { topicId: null },
    ],
  };

  if (perspectiveSlug) {
    baseWhere.perspective = { slug: perspectiveSlug };
  }

  // "following" mode: show articles and reposts from followed users
  if (mode === "following" && session?.user?.id) {
    const followedIds = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const ids = followedIds.map((f) => f.followingId);

    if (ids.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    // Get articles by followed users + articles reposted by followed users
    const [directArticles, repostedArticleIds] = await Promise.all([
      prisma.article.findMany({
        where: { ...baseWhere, authorId: { in: ids } },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: "desc" }],
        select: articleSelect,
      }),
      prisma.repost.findMany({
        where: { userId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { articleId: true, user: { select: { id: true, name: true } } },
      }),
    ]);

    // Merge and dedupe
    const seenIds = new Set(directArticles.map((a) => a.id));
    const repostMap = new Map<string, string>();
    const missingRepostIds: string[] = [];

    for (const r of repostedArticleIds) {
      if (!seenIds.has(r.articleId)) {
        seenIds.add(r.articleId);
        missingRepostIds.push(r.articleId);
        repostMap.set(r.articleId, r.user.name || "Someone");
      }
    }

    let repostedArticles: typeof directArticles = [];
    if (missingRepostIds.length > 0) {
      repostedArticles = await prisma.article.findMany({
        where: { id: { in: missingRepostIds }, status: "PUBLISHED" },
        select: articleSelect,
      });
    }

    const allArticles = [...directArticles, ...repostedArticles]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit + 1);

    const hasMore = allArticles.length > limit;
    const items = hasMore ? allArticles.slice(0, limit) : allArticles;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Annotate reposts
    const enriched = items.map((a) => ({
      ...a,
      repostedBy: repostMap.get(a.id) || null,
    }));

    return NextResponse.json({ items: enriched, nextCursor });
  }

  // Default: discover feed (all published articles, sorted by recency)
  const articles = await prisma.article.findMany({
    where: baseWhere,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { viewCount: "desc" }],
    select: articleSelect,
  });

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, limit) : articles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
