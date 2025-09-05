"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const Navbar = () => {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">Rote</Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : session ? (
              <>
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Dashboard
                </Link>
                <Link href="/content" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Content
                </Link>
                <Link href="/recite" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Recite
                </Link>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Welcome, {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Home
                </Link>
                <Link href="/auth/login" className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Sign In
                </Link>
                <Link href="/auth/register" className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;