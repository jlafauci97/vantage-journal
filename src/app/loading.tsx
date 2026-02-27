export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="animate-pulse space-y-8">
        {/* Hero skeleton */}
        <div className="space-y-3">
          <div className="h-10 w-2/3 rounded bg-gray-200" />
          <div className="h-5 w-1/2 rounded bg-gray-200" />
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl bg-gray-100 p-6">
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-full rounded bg-gray-200" />
              <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 rounded-full bg-gray-200" />
                <div className="h-6 w-16 rounded-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
