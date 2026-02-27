"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArticleCard } from "./ArticleCard";

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string | null;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  viewCount: number;
  likeCount: number;
  createdAt: Date | string;
  perspective: Perspective;
  topic: {
    id: string;
    title: string;
    slug: string;
  };
}

export function FeedList({
  initialArticles = [],
}: {
  initialArticles?: Article[];
}) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [cursor, setCursor] = useState<string | null>(
    initialArticles.length > 0
      ? initialArticles[initialArticles.length - 1].id
      : null
  );
  const [hasMore, setHasMore] = useState(initialArticles.length >= 20);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "20");

      const res = await fetch(`/api/articles/feed?${params}`);
      const data = await res.json();

      if (data.articles?.length > 0) {
        setArticles((prev) => [...prev, ...data.articles]);
        setCursor(data.articles[data.articles.length - 1].id);
        setHasMore(data.articles.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  if (articles.length === 0 && !loading) {
    return (
      <div className="rounded-xl bg-gray-50 p-12 text-center">
        <p className="text-gray-500">No articles yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="py-8 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-navy-900" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && articles.length > 0 && (
          <p className="text-sm text-gray-400">You&apos;ve reached the end</p>
        )}
      </div>
    </div>
  );
}
