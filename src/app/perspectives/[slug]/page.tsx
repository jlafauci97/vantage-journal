import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const perspective = await prisma.perspective.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!perspective) return { title: "Perspective Not Found" };
  return {
    title: `${perspective.name} Perspective`,
    description: `Read news from the ${perspective.name} perspective`,
  };
}

export default async function PerspectiveDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const perspective = await prisma.perspective.findUnique({
    where: { slug },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        include: {
          topic: true,
          perspective: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!perspective) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: perspective.color || "#002168" }}
        >
          {perspective.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {perspective.name}
            </h1>
            <PerspectiveBadge perspective={perspective} size="sm" />
          </div>
          <p className="mt-1 text-gray-500">
            {perspective.articles.length} article{perspective.articles.length !== 1 ? "s" : ""}{" "}
            &middot; {perspective.category}
          </p>
        </div>
      </div>

      {perspective.articles.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <p className="text-gray-500">
            No articles from this perspective yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {perspective.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
