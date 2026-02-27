"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PerspectiveSwitcher } from "@/components/article/PerspectiveSwitcher";
import { ArticleContent } from "@/components/article/ArticleContent";
import { ArticleActions } from "@/components/article/ArticleActions";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";
import { formatDate, estimateReadTime } from "@/lib/utils";

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  perspective: Perspective;
  isLiked: boolean;
  isSaved: boolean;
  userReaction: string | null;
}

interface TopicData {
  id: string;
  title: string;
  description: string;
  sourceUrl: string | null;
  articles: {
    id: string;
    perspective: Perspective;
  }[];
}

export default function PerspectiveArticlePage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const perspectiveSlug = params.perspectiveSlug as string;

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/topics/${topicId}`);
        if (!res.ok) throw new Error("Topic not found");
        const topicData = await res.json();
        setTopic(topicData);

        const matchingArticle = topicData.articles.find(
          (a: { perspective: Perspective }) =>
            a.perspective.slug === perspectiveSlug
        );

        if (matchingArticle) {
          setArticle({
            ...matchingArticle,
            isLiked: matchingArticle.isLiked || false,
            isSaved: matchingArticle.isSaved || false,
            userReaction: matchingArticle.userReaction || null,
          });

          // Record view
          fetch(`/api/articles/${matchingArticle.id}/view`, {
            method: "POST",
          }).catch(() => {});
        }
      } catch {
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [topicId, perspectiveSlug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
          <div className="mt-8 space-y-3">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {error || "Article not found"}
        </h1>
        <Link href="/" className="text-navy-900 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const perspectives = topic.articles.map((a) => a.perspective);

  if (!article) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Perspective not found
        </h1>
        <p className="mb-4 text-gray-500">
          This perspective hasn&apos;t been generated for this topic yet.
        </p>
        <Link href={`/topic/${topicId}`} className="text-navy-900 hover:underline">
          View available perspectives
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Topic Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {topic.title}
        </h1>
        <p className="mt-2 text-lg text-gray-600">{topic.description}</p>
        {topic.sourceUrl && (
          <a
            href={topic.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center text-sm text-navy-900 hover:underline"
          >
            View source article
            <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Perspective Switcher */}
      <PerspectiveSwitcher
        topicId={topicId}
        perspectives={perspectives}
        activeSlug={perspectiveSlug}
      />

      {/* Article */}
      <article className="mt-8">
        <div className="mb-6 flex items-center gap-3">
          <PerspectiveBadge perspective={article.perspective} size="lg" active />
          <span className="text-sm text-gray-500">
            {estimateReadTime(article.content)} min read
          </span>
          <span className="text-sm text-gray-500">
            {formatDate(article.createdAt)}
          </span>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {article.title}
        </h2>

        <p className="mb-8 text-lg leading-relaxed text-gray-600">
          {article.summary}
        </p>

        <ArticleContent content={article.content} />

        <div className="mt-8 border-t border-gray-200 pt-6">
          <ArticleActions
            articleId={article.id}
            initialLikeCount={article.likeCount}
            initialLiked={article.isLiked}
            initialSaved={article.isSaved}
            initialReactions={{}}
            userReactions={article.userReaction ? [article.userReaction] : []}
          />
        </div>
      </article>

      {/* Other Perspectives CTA */}
      {perspectives.length > 1 && (
        <div className="mt-12 rounded-xl bg-gray-50 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              See other perspectives on this story
            </h3>
            <Link
              href={`/topic/${topicId}/compare`}
              className="text-sm font-medium text-navy-900 hover:underline"
            >
              Compare all &rarr;
            </Link>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Compare how {perspectives.length} different viewpoints cover this topic
          </p>
          <div className="flex flex-wrap gap-2">
            {perspectives
              .filter((p) => p.slug !== perspectiveSlug)
              .map((p) => (
                <Link key={p.id} href={`/topic/${topicId}/${p.slug}`}>
                  <PerspectiveBadge perspective={p} size="md" />
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
