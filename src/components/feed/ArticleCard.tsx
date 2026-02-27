import Link from "next/link";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";
import { formatRelativeTime, truncate } from "@/lib/utils";

interface ArticleCardProps {
  article: {
    id: string;
    slug?: string;
    title: string;
    summary: string;
    imageUrl?: string | null;
    viewCount: number;
    likeCount: number;
    voteScore?: number;
    createdAt: Date | string;
    isAiGenerated?: boolean;
    perspective?: {
      name: string;
      slug: string;
      color: string | null;
    } | null;
    topic?: {
      id: string;
      title: string;
      slug: string;
      _count?: { articles: number };
    } | null;
    author?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const perspectiveCount = article.topic?._count?.articles;
  const isUserArticle = !!article.author && !article.isAiGenerated;

  // User articles link to /article/slug, AI articles link to /topic/id/perspective
  const href = isUserArticle && article.slug
    ? `/article/${article.slug}`
    : article.topic && article.perspective
      ? `/topic/${article.topic.id}/${article.perspective.slug}`
      : article.slug
        ? `/article/${article.slug}`
        : "#";

  return (
    <Link
      href={href}
      className="feed-card block rounded-xl bg-white overflow-hidden shadow-sm border border-gray-100"
    >
      {article.imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          {article.perspective && (
            <PerspectiveBadge
              name={article.perspective.name}
              color={article.perspective.color}
              size="sm"
            />
          )}
          {article.isAiGenerated && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              AI
            </span>
          )}
          {perspectiveCount && perspectiveCount > 1 && (
            <span className="text-xs text-gray-400">
              +{perspectiveCount - 1} more perspectives
            </span>
          )}
        </div>

        <h3 className="mb-2 text-lg font-bold text-gray-900 leading-snug">
          {article.title}
        </h3>

        <p className="mb-3 text-sm text-gray-500 leading-relaxed">
          {truncate(article.summary, 150)}
        </p>

        {/* Author info for user articles */}
        {article.author && !article.isAiGenerated && (
          <div className="mb-2 flex items-center gap-2">
            {article.author.image ? (
              <img
                src={article.author.image}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[9px] font-bold text-white">
                {article.author.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span className="text-xs font-medium text-gray-600">
              {article.author.name}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400">
          {article.voteScore !== undefined && article.voteScore !== 0 && (
            <span className={`flex items-center gap-1 font-medium ${
              article.voteScore > 0 ? "text-green-600" : "text-red-500"
            }`}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={article.voteScore > 0 ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
              {article.voteScore > 0 ? "+" : ""}{article.voteScore}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {article.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {article.likeCount}
          </span>
          <span>{formatRelativeTime(article.createdAt)}</span>
        </div>

        {article.topic && (
          <p className="mt-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            {article.topic.title}
          </p>
        )}
      </div>
    </Link>
  );
}
