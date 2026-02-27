import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true },
  });

  return {
    title: topic ? `Compare Perspectives: ${topic.title}` : "Compare",
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId, status: "PUBLISHED" },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        include: {
          perspective: {
            select: { id: true, name: true, slug: true, category: true, color: true },
          },
        },
        orderBy: { perspective: { name: "asc" } },
      },
    },
  });

  if (!topic) notFound();

  const articlesWithPerspective = topic.articles.filter((a) => a.perspective);

  if (articlesWithPerspective.length < 2) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{topic.title}</h1>
        <p className="text-gray-500">
          Need at least 2 perspectives to compare.
        </p>
        <Link
          href={`/topic/${topicId}`}
          className="mt-4 inline-block text-navy-600 hover:underline"
        >
          Back to topic
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/topic/${topicId}`}
          className="text-sm font-medium text-gray-400 hover:text-gray-600"
        >
          &larr; Back to topic
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {topic.title}
        </h1>
        <p className="mt-1 text-gray-500">
          Comparing {articlesWithPerspective.length} perspectives side by side
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {articlesWithPerspective.map((article) => (
          <div
            key={article.id}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Perspective header */}
            <div
              className="px-5 py-3 border-b"
              style={{
                backgroundColor: article.perspective!.color
                  ? `${article.perspective!.color}15`
                  : "#f9fafb",
                borderColor: article.perspective!.color || "#e5e7eb",
              }}
            >
              <PerspectiveBadge
                name={article.perspective!.name}
                color={article.perspective!.color}
                size="sm"
              />
            </div>

            {/* Article content */}
            <div className="p-5">
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                {article.title}
              </h3>
              <p className="mb-4 text-sm text-gray-500 line-clamp-4">
                {article.summary}
              </p>

              {/* Content preview */}
              <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 line-clamp-8">
                {article.content.replace(/<[^>]*>/g, "").slice(0, 500)}
                {article.content.length > 500 && "..."}
              </div>

              <Link
                href={`/topic/${topicId}/${article.perspective!.slug}`}
                className="text-sm font-medium text-navy-600 hover:underline"
              >
                Read full article &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
