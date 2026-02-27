import type { Metadata } from "next";
import { SessionProvider } from "@/providers/SessionProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vantage Journal - Every Perspective, One Story",
    template: "%s | Vantage Journal",
  },
  description:
    "Read the news from every perspective. Vantage Journal presents stories through multiple ideological and cultural viewpoints so you can understand the full picture.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <SessionProvider>
          <Navbar />
          <main className="pt-16">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
