"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
  _count: { articles: number };
}

type GroupedPerspectives = Record<string, Perspective[]>;

export default function NewTopicPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPerspectives, setSelectedPerspectives] = useState<string[]>([]);
  const [perspectives, setPerspectives] = useState<GroupedPerspectives>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/perspectives")
      .then((r) => r.json())
      .then((data: Perspective[]) => {
        const grouped: GroupedPerspectives = {};
        for (const p of data) {
          if (!grouped[p.category]) grouped[p.category] = [];
          grouped[p.category].push(p);
        }
        setPerspectives(grouped);
      });
  }, []);

  const togglePerspective = (id: string) => {
    setSelectedPerspectives((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectCategory = (category: string) => {
    const ids = perspectives[category]?.map((p) => p.id) || [];
    const allSelected = ids.every((id) => selectedPerspectives.includes(id));
    if (allSelected) {
      setSelectedPerspectives((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPerspectives((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPerspectives.length === 0) {
      setError("Select at least one perspective");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Create the topic
      const topicRes = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, sourceUrl: sourceUrl || undefined }),
      });

      if (!topicRes.ok) {
        const data = await topicRes.json();
        throw new Error(data.error || "Failed to create topic");
      }

      const topic = await topicRes.json();

      // Trigger generation
      const genRes = await fetch(`/api/topics/${topic.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perspectiveIds: selectedPerspectives }),
      });

      if (!genRes.ok) {
        const data = await genRes.json();
        throw new Error(data.error || "Failed to start generation");
      }

      router.push(`/admin/topics/${topic.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Create New Topic</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Topic Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="e.g., Federal Reserve Raises Interest Rates"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="Brief description of the news story..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Source URL (optional)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Perspective Selection */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Select Perspectives
            </h2>
            <span className="text-sm text-gray-500">
              {selectedPerspectives.length} selected
            </span>
          </div>

          <div className="space-y-6">
            {Object.entries(perspectives).map(([category, perps]) => (
              <div key={category}>
                <button
                  type="button"
                  onClick={() => selectCategory(category)}
                  className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {category} ({perps.length})
                </button>
                <div className="flex flex-wrap gap-2">
                  {perps.map((p) => {
                    const isSelected = selectedPerspectives.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePerspective(p.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: p.color }
                            : undefined
                        }
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating & Generating..." : "Create Topic & Generate Articles"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
