import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Manage Perspectives" };

export default async function AdminPerspectivesPage() {
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Perspectives</h1>
        <p className="text-sm text-gray-500">
          {perspectives.length} total perspectives
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, perps]) => (
          <div key={category} className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({perps.length})
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {perps.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: p.color || "#6b7280" }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {p._count.articles} articles
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
