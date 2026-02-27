import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-8 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Admin</h2>
            <nav className="flex gap-6">
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/topics"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Topics
              </Link>
              <Link
                href="/admin/perspectives"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Perspectives
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
