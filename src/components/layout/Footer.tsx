import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Vantage Journal. All rights
          reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/perspectives" className="hover:text-gray-700">
            Perspectives
          </Link>
          <Link href="/trending" className="hover:text-gray-700">
            Trending
          </Link>
        </div>
      </div>
    </footer>
  );
}
