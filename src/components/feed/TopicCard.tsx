import Link from "next/link";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";
import { formatRelativeTime } from "@/lib/utils";

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    slug?: string;
    description?: string | null;
    imageUrl?: string | null;
    createdAt?: Date | string;
    articles: {
      perspective: {
        name: string;
        slug: string;
        color: string | null;
      } | null;
    }[];
  };
}

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <Link
      href={`/topic/${topic.id}`}
      className="feed-card block rounded-xl bg-white overflow-hidden shadow-sm border border-gray-100"
    >
      {topic.imageUrl && (
        <div className="aspect-[2/1] w-full overflow-hidden bg-gray-100">
          <img
            src={topic.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <h3 className="mb-2 text-xl font-bold text-gray-900">
          {topic.title}
        </h3>
        {topic.description && (
          <p className="mb-3 text-sm text-gray-500 line-clamp-2">
            {topic.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topic.articles.filter((a) => a.perspective).slice(0, 5).map((a, i) => (
            <PerspectiveBadge
              key={i}
              name={a.perspective!.name}
              color={a.perspective!.color}
              size="sm"
            />
          ))}
          {topic.articles.length > 5 && (
            <span className="px-2 py-0.5 text-xs text-gray-400">
              +{topic.articles.length - 5} more
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {topic.articles.length} perspectives
          {topic.createdAt && (
            <> &middot; {formatRelativeTime(topic.createdAt)}</>
          )}
        </div>
      </div>
    </Link>
  );
}
