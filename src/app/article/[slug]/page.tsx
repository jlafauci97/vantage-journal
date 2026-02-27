"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ArticleActions } from "@/components/article/ArticleActions";
import { VoteButtons } from "@/components/article/VoteButtons";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";
import { formatDate, estimateReadTime } from "@/lib/utils";

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  contentType: string;
  isAiGenerated: boolean;
  imageUrl: string | null;
  viewCount: number;
  likeCount: number;
  voteScore: number;
  repostCount: number;
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
  userVote: number | null;
  isReposted: boolean;
  perspective: {
    id: string;
    name: string;
    slug: string;
    category: string;
    color: string | null;
  } | null;
  topic: {
    id: string;
    title: string;
    slug: string;
  } | null;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  _count: {
    comments: number;
    likes: number;
    saves: number;
  };
}

export default function ArticleViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/articles/by-slug/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setArticle(data);
        // Track view
        fetch(`/api/articles/${data.id}/view`, { method: "POST" }).catch(
          () => {}
        );
      })
      .catch(() => setError("Article not found."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Article not found</h1>
        <p className="mt-2 text-gray-500">
          This article may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-navy-600 hover:underline"
        >
          Back to feed
        </Link>
      </div>
    );
  }

  const readTime = estimateReadTime(article.content);
  const isOwner = session?.user?.id === article.author?.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Cover Image */}
      {article.imageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={article.imageUrl}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight: 400 }}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {article.perspective && (
            <PerspectiveBadge
              name={article.perspective.name}
              color={article.perspective.color}
              size="sm"
            />
          )}
          {article.isAiGenerated && (
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              AI Generated
            </span>
          )}
          {article.topic && (
            <Link
              href={`/topic/${article.topic.id}`}
              className="text-xs font-medium text-gray-400 uppercase tracking-wide hover:text-gray-600"
            >
              {article.topic.title}
            </Link>
          )}
        </div>

        <h1 className="mb-3 text-3xl font-bold text-gray-900 leading-tight sm:text-4xl">
          {article.title}
        </h1>

        <p className="mb-4 text-lg text-gray-500">{article.summary}</p>

        {/* Author & Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {article.author ? (
              <Link
                href={`/profile/${article.author.id}`}
                className="flex items-center gap-3 group"
              >
                {article.author.image ? (
                  <Image
                    src={article.author.image}
                    alt={article.author.name || ""}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                    {article.author.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-navy-600">
                    {article.author.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(article.createdAt)} &middot; {readTime} min read
                  </p>
                </div>
              </Link>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Vantage Journal
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(article.createdAt)} &middot; {readTime} min read
                </p>
              </div>
            )}
          </div>

          {isOwner && (
            <Link
              href={`/write/${article.id}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <hr className="mb-6" />

      {/* Content */}
      {article.contentType === "HTML" ? (
        <div
          className="prose prose-lg prose-gray mx-auto max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      ) : (
        <div className="prose prose-lg prose-gray mx-auto max-w-none">
          {/* For markdown content, we import the existing ArticleContent */}
          <ArticleContentMarkdown content={article.content} />
        </div>
      )}

      <hr className="my-8" />

      {/* Vote & Repost */}
      <VoteButtons
        articleId={article.id}
        initialScore={article.voteScore}
        initialVote={article.userVote}
        initialReposted={article.isReposted}
        initialRepostCount={article.repostCount}
      />

      <div className="my-4" />

      {/* Actions */}
      <ArticleActions
        articleId={article.id}
        initialLiked={article.isLiked}
        initialSaved={article.isSaved}
        initialLikeCount={article.likeCount}
        initialReactions={{}}
        userReactions={[]}
      />

      {/* Stats */}
      <div className="mt-6 flex items-center gap-4 text-sm text-gray-400">
        <span>{article.viewCount} views</span>
        <span>{article._count.comments} comments</span>
      </div>
    </div>
  );
}

function ArticleContentMarkdown({ content }: { content: string }) {
  // Dynamic import to avoid SSR issues with react-markdown
  const [Md, setMd] = useState<React.ComponentType<{ children: string }> | null>(null);

  useEffect(() => {
    import("react-markdown").then((mod) => {
      setMd(() => mod.default);
    });
  }, []);

  if (!Md) return <div className="animate-pulse h-96 bg-gray-50 rounded" />;

  return <Md>{content}</Md>;
}
