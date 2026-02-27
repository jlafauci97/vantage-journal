import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/feed/TopicCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trending",
  description: "Trending topics and stories on Vantage Journal",
};

export default async function TrendingPage() {
  const topics = await prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        include: { perspective: true },
        orderBy: { viewCount: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Sort by total views across all articles (trending)
  const sortedTopics = topics
    .map((topic) => ({
      ...topic,
      totalViews: topic.articles.reduce((sum, a) => sum + a.viewCount, 0),
    }))
    .sort((a, b) => b.totalViews - a.totalViews);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trending</h1>
        <p className="mt-2 text-lg text-gray-600">
          The most-read stories right now
        </p>
      </div>

      {sortedTopics.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <p className="text-gray-500">No trending topics yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTopics.map((topic, index) => (
            <div key={topic.id} className="relative">
              {index < 3 && (
                <div className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white shadow-md">
                  {index + 1}
                </div>
              )}
              <TopicCard topic={topic} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
