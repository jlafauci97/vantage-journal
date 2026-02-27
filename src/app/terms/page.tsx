export const metadata = {
  title: "Terms of Service - Vantage Journal",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-4xl font-bold text-gray-900">
        Terms of Service
      </h1>
      <p className="mb-8 text-sm text-gray-400">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using Vantage Journal, you agree to be bound by
            these Terms of Service. If you do not agree to these terms, please
            do not use our platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            2. User Accounts
          </h2>
          <p>
            You are responsible for maintaining the security of your account and
            all activities that occur under your account. You must provide
            accurate information when creating your account and keep it updated.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            3. User Content
          </h2>
          <p>
            You retain ownership of the content you create on Vantage Journal.
            By publishing content, you grant us a non-exclusive license to
            display, distribute, and promote your content on our platform.
          </p>
          <p className="mt-2">
            You agree not to post content that is illegal, harmful, threatening,
            abusive, defamatory, or otherwise objectionable. We reserve the
            right to remove content that violates these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            4. AI-Generated Content
          </h2>
          <p>
            Vantage Journal uses AI to generate perspective-based articles.
            AI-generated content is clearly labeled and is provided for
            informational and educational purposes. We do not guarantee the
            accuracy or completeness of AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            5. Prohibited Conduct
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Impersonating others or creating fake accounts</li>
            <li>Spamming, harassment, or abuse of other users</li>
            <li>Attempting to access other users&apos; accounts</li>
            <li>Using automated tools to scrape or access our platform</li>
            <li>Circumventing security measures or restrictions</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            6. Termination
          </h2>
          <p>
            We may suspend or terminate your account at any time for violations
            of these terms. You may delete your account at any time through
            your account settings.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            7. Disclaimer
          </h2>
          <p>
            Vantage Journal is provided &quot;as is&quot; without warranties of
            any kind. We are not responsible for the accuracy of user-generated
            or AI-generated content. Use the platform at your own risk.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            8. Changes to Terms
          </h2>
          <p>
            We may update these terms from time to time. Continued use of
            Vantage Journal after changes constitutes acceptance of the updated
            terms.
          </p>
        </section>
      </div>
    </div>
  );
}
