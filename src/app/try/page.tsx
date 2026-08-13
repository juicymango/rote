import type { Metadata } from "next";
import Link from "next/link";
import DemoSession from "@/components/demo/DemoSession";

export const metadata: Metadata = {
  title: "Try Rote",
  description: "Try a small spaced-repetition review before creating an account.",
};

export default function TryPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Rote</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Remember more with less effort.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-600">
            Rote turns small sets of knowledge into focused review sessions, so you can practice recalling what matters and come back at the right time.
          </p>
        </header>

        <DemoSession />

        <section className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-indigo-950">Ready to use your own cards?</h2>
          <p className="mt-2 text-indigo-900">
            Create a free account to add cards, import Markdown, and keep your review schedule across devices.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="min-h-11 rounded-md bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Create a free account
            </Link>
            <Link
              href="/auth/login"
              className="min-h-11 rounded-md bg-white px-5 py-3 font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100"
            >
              Log in
            </Link>
          </div>
        </section>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
