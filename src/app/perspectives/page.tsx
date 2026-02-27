import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Perspectives",
  description: "Browse all perspectives and viewpoints",
};

export default async function PerspectivesPage() {
  const perspectives = await prisma.perspective.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { articles: true } },
    },
  });

  const grouped: Record<string, typeof perspectives> = {};
  for (const p of perspectives) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Perspectives</h1>
        <p className="mt-2 text-lg text-gray-600">
          Explore news through {perspectives.length} unique viewpoints across{" "}
          {Object.keys(grouped).length} categories
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([category, perps]) => (
          <section key={category}>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ||
                    "#6b7280",
                }}
              />
              <h2 className="text-xl font-semibold text-gray-900">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ||
                  category}
              </h2>
              <span className="text-sm text-gray-500">
                {perps.length} perspectives
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {perps.map((p) => (
                <Link
                  key={p.id}
                  href={`/perspectives/${p.slug}`}
                  className="group rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: p.color || "#002168" }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-navy-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p._count.articles} article{p._count.articles !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
