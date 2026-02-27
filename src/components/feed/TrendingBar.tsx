"use client";

import Link from "next/link";

interface TrendingTopic {
  id: string;
  title: string;
  slug: string;
  _count?: {
    articles: number;
  };
}

export function TrendingBar({ topics }: { topics: TrendingTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-orange-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 16.89 19.32C18.55 17.66 19.12 15.13 18.16 12.96L17.96 12.56C17.88 12.43 17.77 12.31 17.66 12.2V11.2ZM14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z" />
        </svg>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Trending
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/topic/${topic.id}`}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {topic.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
