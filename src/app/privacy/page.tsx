import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Rote",
  description: "How Rote handles account, card, and product event data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link href="/try" className="text-sm text-indigo-600 hover:underline">
          ← Back to Rote
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Privacy</h1>
        <p className="mt-3 text-gray-600">
          This page describes the data used by the current Rote public beta.
        </p>

        <div className="mt-8 space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">What we store</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Your email address and authentication information, so you can sign in.</li>
              <li>The cards and review schedule that you choose to save in your account.</li>
              <li>Limited product events such as creating a card or completing a review session.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">What we do not collect</h2>
            <p className="mt-3">
              Rote&apos;s product events do not include card keys, card values, search terms, IP addresses, or cross-site tracking identifiers. The public demo at <code>/try</code> does not create an account or save demo cards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Service providers</h2>
            <p className="mt-3">
              Rote is deployed through Vercel and uses Supabase for authentication and database hosting. These providers process data as needed to deliver the service. Rote does not currently show advertisements or sell account data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Deletion requests</h2>
            <p className="mt-3">
              You can delete individual cards from the Items page. To request deletion of your account and its stored data, email the project maintainer at{" "}
              <a className="text-indigo-600 hover:underline" href="mailto:381030480@qq.com">
                381030480@qq.com
              </a>
              . Include the account email you used for Rote. Do not include your card contents in the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Questions and changes</h2>
            <p className="mt-3">
              Contact the project maintainer at the address above if you have a privacy question. This page will be updated if the data practices of the public beta change.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
