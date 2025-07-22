"use client";

import { useSearchParams } from "next/navigation";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-dark">
      <h1 className="text-2xl font-bold text-dark dark:text-white mb-4">Authentication Error</h1>
      <p className="text-red-500 mb-4">{error || "An unknown error occurred during authentication."}</p>
      <a
        href="/auth/sign-in"
        className="text-primary hover:underline"
      >
        Back to Sign In
      </a>
    </div>
  );
}