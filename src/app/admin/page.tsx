import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const [topicCount, articleCount, userCount, perspectiveCount] =
    await Promise.all([
      prisma.topic.count(),
      prisma.article.count(),
      prisma.user.count(),
      prisma.perspective.count(),
    ]);

  const recentTopics = await prisma.topic.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true } },
    },
  });

  const stats = [
    { label: "Topics", value: topicCount, href: "/admin/topics" },
    { label: "Articles", value: articleCount, href: "/admin/topics" },
    { label: "Users", value: userCount, href: "#" },
    { label: "Perspectives", value: perspectiveCount, href: "/admin/perspectives" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/admin/topics/new"
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
        >
          New Topic
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent Topics */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Topics
        </h2>
        {recentTopics.length === 0 ? (
          <p className="text-sm text-gray-500">No topics yet. Create your first topic to get started.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/admin/topics/${topic.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
              >
                <div>
                  <p className="font-medium text-gray-900">{topic.title}</p>
                  <p className="text-sm text-gray-500">
                    {topic._count.articles} articles
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    topic.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : topic.status === "GENERATING"
                        ? "bg-yellow-100 text-yellow-800"
                        : topic.status === "ARCHIVED"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {topic.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
