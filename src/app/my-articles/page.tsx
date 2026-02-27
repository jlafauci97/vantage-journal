"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

interface MyArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  status: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

export default function MyArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [articles, setArticles] = useState<MyArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch(`/api/articles/user/${session.user.id}?status=${tab}`)
      .then((r) => r.json())
      .then((data) => setArticles(data.items || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id, tab]);

  const handleDelete = async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    const res = await fetch(`/api/articles/${articleId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Articles</h1>
        <Link
          href="/write"
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
        >
          Write New
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab("PUBLISHED")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "PUBLISHED"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setTab("DRAFT")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "DRAFT"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-100 h-24" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">
            {tab === "PUBLISHED"
              ? "You haven't published any articles yet."
              : "You don't have any drafts."}
          </p>
          <Link
            href="/write"
            className="mt-3 inline-block text-sm font-medium text-navy-600 hover:underline"
          >
            Write your first article
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-xl bg-white p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={
                      article.status === "PUBLISHED"
                        ? `/article/${article.slug}`
                        : `/write/${article.id}`
                    }
                    className="text-lg font-semibold text-gray-900 hover:text-navy-600 line-clamp-1"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>{formatRelativeTime(article.updatedAt)}</span>
                    {article.status === "PUBLISHED" && (
                      <>
                        <span>{article.viewCount} views</span>
                        <span>{article.likeCount} likes</span>
                        <span>{article._count.comments} comments</span>
                      </>
                    )}
                  </div>
                </div>

                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/write/${article.id}`}
                  className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
