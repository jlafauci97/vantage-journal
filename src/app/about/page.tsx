import Link from "next/link";

export const metadata = {
  title: "About - Vantage Journal",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-bold text-gray-900">
        About Vantage Journal
      </h1>

      <div className="space-y-6 text-gray-600 leading-relaxed">
        <p className="text-lg">
          Vantage Journal is a perspective-based news platform that presents
          stories through multiple viewpoints, helping readers understand the
          full landscape of any topic.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 pt-4">Our Mission</h2>
        <p>
          In today&apos;s media landscape, most news sources present stories
          from a single angle. Vantage Journal changes that by offering
          AI-generated articles that explore the same topic from conservative,
          liberal, religious, economic, cultural, and other perspectives.
        </p>
        <p>
          We believe that understanding different viewpoints leads to better
          informed citizens and more productive conversations. Our goal is not
          to tell you what to think, but to show you how different people think
          about the same issues.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 pt-4">
          How It Works
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Topics are sourced from current events and analyzed through our
            AI-powered perspective engine.
          </li>
          <li>
            Each topic generates multiple articles, one for each perspective,
            presenting distinct arguments and considerations.
          </li>
          <li>
            Users can also write their own articles, contributing unique
            viewpoints to the community.
          </li>
          <li>
            The Compare feature lets you view perspectives side by side,
            making it easy to understand different positions.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 pt-4">
          Community
        </h2>
        <p>
          Beyond AI-generated content, Vantage Journal is a social platform
          where users can write articles, engage with comments, follow other
          writers, and build a feed tailored to their interests. We encourage
          respectful dialogue and thoughtful engagement across all perspectives.
        </p>

        <div className="mt-8 rounded-xl bg-navy-50 p-6">
          <p className="font-semibold text-navy-900">
            Every perspective. One story.
          </p>
          <p className="mt-2 text-sm text-navy-700">
            Start exploring different viewpoints today.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
          >
            Explore Topics
          </Link>
        </div>
      </div>
    </div>
  );
}
