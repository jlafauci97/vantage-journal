import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true, description: true },
  });

  if (!topic) return { title: "Topic Not Found" };

  return {
    title: topic.title,
    description: topic.description,
  };
}

export default async function TopicPage({
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
        include: { perspective: true },
        orderBy: { perspective: { name: "asc" } },
      },
    },
  });

  if (!topic) notFound();

  if (topic.articles.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{topic.title}</h1>
        <p className="text-gray-500">
          No articles have been generated for this topic yet.
        </p>
      </div>
    );
  }

  const firstArticle = topic.articles[0];
  const perspectiveSlug = firstArticle.perspective?.slug;
  if (!perspectiveSlug) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{topic.title}</h1>
        <p className="text-gray-500">No perspectives available for this topic.</p>
      </div>
    );
  }
  redirect(`/topic/${topicId}/${perspectiveSlug}`);
}
