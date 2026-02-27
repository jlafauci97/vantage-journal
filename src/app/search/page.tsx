"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopicCard } from "@/components/feed/TopicCard";
import { ArticleCard } from "@/components/feed/ArticleCard";

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  slug: string;
  createdAt: string;
  articles: {
    id: string;
    perspective: Perspective;
  }[];
}

interface Article {
  id: string;
  title: string;
  summary: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  perspective: Perspective;
  topic: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(query);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"topics" | "articles">("topics");

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTopics(data.topics || []);
      setArticles(data.articles || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) performSearch(query);
  }, [query, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search topics and articles..."
            className="w-full rounded-xl border border-gray-300 py-4 pl-12 pr-4 text-lg outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            autoFocus
          />
        </div>
      </form>

      {query && (
        <>
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setTab("topics")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "topics"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Topics ({topics.length})
            </button>
            <button
              onClick={() => setTab("articles")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "articles"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Articles ({articles.length})
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-6">
                  <div className="h-5 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : tab === "topics" ? (
            topics.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-12 text-center">
                <p className="text-gray-500">
                  No topics found for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            )
          ) : articles.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                No articles found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </>
      )}

      {!query && (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <p className="text-lg text-gray-500">
            Search for topics and articles across all perspectives
          </p>
        </div>
      )}
    </div>
  );
}
