"use client";

import Link from "next/link";
import { PerspectiveBadge } from "@/components/perspective/PerspectiveBadge";

interface PerspectiveOption {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface PerspectiveSwitcherProps {
  perspectives: PerspectiveOption[];
  activeSlug: string;
  topicId: string;
}

export function PerspectiveSwitcher({
  perspectives,
  activeSlug,
  topicId,
}: PerspectiveSwitcherProps) {
  if (perspectives.length <= 1) return null;

  return (
    <div className="mb-8">
      <p className="mb-3 text-sm font-medium text-gray-500">
        See how different perspectives cover this story
      </p>
      <div className="flex flex-wrap gap-2">
        {perspectives.map((p) => (
          <Link
            key={p.id}
            href={`/topic/${topicId}/${p.slug}`}
            scroll={false}
          >
            <PerspectiveBadge
              name={p.name}
              color={p.color}
              size="md"
              active={p.slug === activeSlug}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
