import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Manage Topics" };

export default async function AdminTopicsPage() {
  const topics = await prisma.topic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
        <Link
          href="/admin/topics/new"
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
        >
          New Topic
        </Link>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No topics yet.</p>
          <Link
            href="/admin/topics/new"
            className="mt-4 inline-block text-sm font-semibold text-navy-900 hover:underline"
          >
            Create your first topic
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Articles</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{topic.title}</p>
                    {topic.description && (
                      <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                        {topic.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
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
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {topic._count.articles}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(topic.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/topics/${topic.id}`}
                      className="text-sm font-medium text-navy-900 hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
