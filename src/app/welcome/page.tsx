"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function WelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        setEmail(user.email ?? null);
      }
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (email === null) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Rote!</h1>
        <p className="text-gray-600 mb-2">
          You are signed in as{" "}
          <span className="font-semibold text-indigo-600">{email}</span>.
        </p>
        <p className="text-gray-500 mb-6 text-sm">
          Build your memory with spaced repetition.
        </p>
        <div className="flex flex-col gap-3 mb-4">
          <Link
            href="/items"
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-center"
          >
            Go to Items
          </Link>
          <Link
            href="/session"
            className="w-full py-2 px-4 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-medium text-center"
          >
            Start Session
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
