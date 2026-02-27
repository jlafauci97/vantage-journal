export const metadata = {
  title: "Privacy Policy - Vantage Journal",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-4xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-400">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            1. Information We Collect
          </h2>
          <p>When you use Vantage Journal, we may collect:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Account information:</strong> Name, email address, and
              profile picture when you sign up
            </li>
            <li>
              <strong>Profile information:</strong> Bio, workplace, interests,
              and viewpoints you choose to share
            </li>
            <li>
              <strong>Content:</strong> Articles, comments, and other content
              you create
            </li>
            <li>
              <strong>Usage data:</strong> How you interact with the platform,
              including articles viewed, likes, and follows
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and improve our platform</li>
            <li>To personalize your feed and content recommendations</li>
            <li>To send notifications about activity on your content</li>
            <li>To maintain the security of your account</li>
            <li>To analyze usage patterns and improve features</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            3. Information Sharing
          </h2>
          <p>
            We do not sell your personal information. We may share information
            with:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Other users:</strong> Your profile, articles, and comments
              are publicly visible
            </li>
            <li>
              <strong>Service providers:</strong> Third-party services that help
              us operate the platform (hosting, authentication, image storage)
            </li>
            <li>
              <strong>Legal requirements:</strong> When required by law or to
              protect our rights
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            4. Data Security
          </h2>
          <p>
            We use industry-standard security measures to protect your data,
            including encrypted connections and secure authentication. However,
            no system is perfectly secure, and we cannot guarantee absolute
            security.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            5. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Access and download your data</li>
            <li>Update or correct your information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            6. Cookies
          </h2>
          <p>
            We use essential cookies for authentication and session management.
            We do not use third-party tracking cookies for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            7. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. We will notify
            you of significant changes through the platform or by email.
          </p>
        </section>
      </div>
    </div>
  );
}
