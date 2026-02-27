import { prisma } from "@/lib/prisma";
import { TrendingBar } from "@/components/feed/TrendingBar";
import { TopicCard } from "@/components/feed/TopicCard";
import { FeedTabs } from "@/components/feed/FeedTabs";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trendingTopics, latestArticles] = await Promise.all([
    prisma.topic.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        articles: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            perspective: { select: { id: true, name: true, slug: true, category: true, color: true } },
          },
        },
        _count: { select: { articles: true } },
      },
    }),
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { topic: { status: "PUBLISHED" } },
          { topicId: null },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { viewCount: "desc" }],
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        imageUrl: true,
        viewCount: true,
        likeCount: true,
        voteScore: true,
        createdAt: true,
        isAiGenerated: true,
        perspective: {
          select: { id: true, name: true, slug: true, category: true, color: true },
        },
        topic: {
          select: { id: true, title: true, slug: true, _count: { select: { articles: true } } },
        },
        author: {
          select: { id: true, name: true, image: true },
        },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
          Every Perspective.{" "}
          <span className="text-navy-900">One Story.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
          Read the news through multiple viewpoints. Understand how the same
          story looks from conservative, liberal, religious, economic, and
          cultural perspectives.
        </p>
      </section>

      {/* Trending Bar */}
      <TrendingBar topics={trendingTopics} />

      {/* Featured Topics */}
      {trendingTopics.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Top Stories</h2>
            <Link
              href="/trending"
              className="text-sm font-medium text-navy-900 hover:text-navy-700"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trendingTopics.slice(0, 6).map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* Articles with Discover / Your Feed tabs */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Articles</h2>
        <FeedTabs discoverArticles={latestArticles} />
      </section>
    </div>
  );
}
