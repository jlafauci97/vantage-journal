"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";

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
  status: string;
  viewCount: number;
  likeCount: number;
  perspective: Perspective;
  createdAt: string;
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  articles: Article[];
}

export default function AdminTopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchTopic = useCallback(async () => {
    try {
      const res = await fetch(`/api/topics/${topicId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setTopic(data);
    } catch {
      setError("Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  // Poll if generating
  useEffect(() => {
    if (topic?.status !== "GENERATING") return;
    const interval = setInterval(fetchTopic, 5000);
    return () => clearInterval(interval);
  }, [topic?.status, fetchTopic]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this topic and all its articles?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/topics");
    } catch {
      setError("Failed to delete topic");
      setDeleting(false);
    }
  };

  const handleRegenerate = async (perspectiveIds: string[]) => {
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/topics/${topicId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perspectiveIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }
      fetchTopic();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
      </div>
    );
  }

  if (error && !topic) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  if (!topic) return null;

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Topic Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
          <p className="mt-1 text-gray-500">{topic.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                topic.status === "PUBLISHED"
                  ? "bg-green-100 text-green-800"
                  : topic.status === "GENERATING"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {topic.status}
            </span>
            {topic.sourceUrl && (
              <a
                href={topic.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-navy-900 hover:underline"
              >
                Source
              </a>
            )}
            {topic.status === "PUBLISHED" && (
              <Link
                href={`/topic/${topic.id}`}
                className="text-sm text-navy-900 hover:underline"
              >
                View public page
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Generating Status */}
      {topic.status === "GENERATING" && (
        <div className="mb-8 rounded-xl bg-yellow-50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
            <p className="font-medium text-yellow-800">
              Generating articles... This may take a few minutes.
            </p>
          </div>
          <p className="mt-2 text-sm text-yellow-700">
            The page will automatically refresh when generation is complete.
          </p>
        </div>
      )}

      {/* Articles */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Articles ({topic.articles.length})
          </h2>
          {topic.articles.length > 0 && (
            <button
              onClick={() =>
                handleRegenerate(topic.articles.map((a) => a.perspective.id))
              }
              disabled={regenerating || topic.status === "GENERATING"}
              className="text-sm font-medium text-navy-900 hover:underline disabled:opacity-50"
            >
              {regenerating ? "Regenerating..." : "Regenerate All"}
            </button>
          )}
        </div>

        {topic.articles.length === 0 ? (
          <p className="text-sm text-gray-500">
            No articles yet. They&apos;ll appear here once generation completes.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {topic.articles.map((article) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <PerspectiveBadge
                        perspective={article.perspective}
                        size="sm"
                      />
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          article.status === "PUBLISHED"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {article.status}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {article.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="mt-1 flex gap-4 text-xs text-gray-400">
                      <span>{article.viewCount} views</span>
                      <span>{article.likeCount} likes</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRegenerate([article.perspective.id])}
                    disabled={regenerating}
                    className="shrink-0 text-sm text-gray-500 hover:text-navy-900"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
