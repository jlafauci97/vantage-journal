"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ImageUpload } from "@/components/upload/ImageUpload";

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string | null;
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [perspectiveId, setPerspectiveId] = useState("");
  const [currentStatus, setCurrentStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/perspectives")
      .then((r) => r.json())
      .then((data) => setPerspectives(data.perspectives || data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!articleId) return;
    fetch(`/api/articles/${articleId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((article) => {
        setTitle(article.title);
        setSummary(article.summary);
        setContent(article.content);
        setImageUrl(article.imageUrl || "");
        setPerspectiveId(article.perspectiveId || "");
        setCurrentStatus(article.status);
        setLoaded(true);
      })
      .catch(() => {
        setError("Article not found or you don't have access.");
      });
  }, [articleId]);

  const handleSubmit = async (publishStatus: "DRAFT" | "PUBLISHED") => {
    if (!title.trim() || !summary.trim() || !content.trim()) {
      setError("Title, summary, and content are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          content,
          imageUrl: imageUrl || undefined,
          perspectiveId: perspectiveId || undefined,
          status: publishStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const updated = await res.json();

      if (publishStatus === "PUBLISHED") {
        router.push(`/article/${updated.slug}`);
      } else {
        router.push("/my-articles");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || (!loaded && !error)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-96 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Edit Article</h1>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Cover Image */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cover Image</h2>
          <ImageUpload
            endpoint="articleCoverImage"
            value={imageUrl}
            onChange={setImageUrl}
            aspectHint="Recommended: 1200 x 630px"
          />
        </div>

        {/* Title & Summary */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-lg font-semibold outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="Your article title..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="A brief summary of your article..."
            />
            <p className="mt-1 text-xs text-gray-400">{summary.length}/300</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Perspective (optional)
            </label>
            <select
              value={perspectiveId}
              onChange={(e) => setPerspectiveId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="">No specific perspective</option>
              {perspectives.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Editor */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content</h2>
          {loaded && (
            <RichTextEditor content={content} onChange={setContent} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit("PUBLISHED")}
            disabled={saving}
            className="flex-1 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : currentStatus === "PUBLISHED" ? "Update" : "Publish"}
          </button>
          {currentStatus !== "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Save Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
