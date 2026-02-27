"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ArticleCard } from "./ArticleCard";

interface Article {
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
  repostedBy?: string | null;
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
  _count?: { comments: number };
}

interface FeedTabsProps {
  discoverArticles: Article[];
}

export function FeedTabs({ discoverArticles }: FeedTabsProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"discover" | "following">(
    "discover"
  );
  const [followingArticles, setFollowingArticles] = useState<Article[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  const loadFollowing = useCallback(async () => {
    if (followingLoaded || followingLoading) return;
    setFollowingLoading(true);
    try {
      const res = await fetch("/api/articles/feed?mode=following&limit=20");
      const data = await res.json();
      setFollowingArticles(data.items || []);
      setFollowingLoaded(true);
    } finally {
      setFollowingLoading(false);
    }
  }, [followingLoaded, followingLoading]);

  useEffect(() => {
    if (activeTab === "following" && session?.user) {
      loadFollowing();
    }
  }, [activeTab, session, loadFollowing]);

  const showTabs = !!session?.user;

  return (
    <div>
      {showTabs && (
        <div className="mb-6 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("discover")}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "discover"
                ? "border-b-2 border-navy-900 text-navy-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "following"
                ? "border-b-2 border-navy-900 text-navy-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Your Feed
          </button>
        </div>
      )}

      {activeTab === "discover" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discoverArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {activeTab === "following" && (
        <>
          {followingLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-navy-900" />
              <span className="text-sm">Loading your feed...</span>
            </div>
          ) : followingArticles.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-12 text-center">
              <p className="text-gray-500">
                Follow authors and creators to see their articles here.
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Discover articles in the Discover tab and follow authors you like.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {followingArticles.map((article) => (
                <div key={article.id}>
                  {article.repostedBy && (
                    <p className="mb-1 text-xs font-medium text-gray-400">
                      <svg className="inline h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {article.repostedBy} reposted
                    </p>
                  )}
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
