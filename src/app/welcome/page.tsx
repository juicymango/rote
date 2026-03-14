import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Rote</h1>
        <p className="text-gray-600 mb-2">
          You are signed in as{" "}
          <span className="font-semibold">{user.email}</span>.
        </p>
        <p className="text-gray-600 mb-8">
          Start building your spaced repetition memory today.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/dashboard"
            className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Go to Dashboard
          </a>
          <a
            href="/content"
            className="block w-full py-2 px-4 bg-white border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 font-medium"
          >
            Manage Content
          </a>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
