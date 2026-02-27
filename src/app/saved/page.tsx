"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArticleCard } from "@/components/feed/ArticleCard";

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

interface SavedItem {
  id: string;
  article: Article;
  createdAt: string;
}

export default function SavedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/articles/saved")
      .then((r) => r.json())
      .then((data) => setSaved(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Saved Articles</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-6">
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-full rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Saved Articles</h1>

      {saved.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="mt-4 text-gray-500">No saved articles yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Bookmark articles to read them later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {saved.map((item) => (
            <ArticleCard key={item.id} article={item.article} />
          ))}
        </div>
      )}
    </div>
  );
}
