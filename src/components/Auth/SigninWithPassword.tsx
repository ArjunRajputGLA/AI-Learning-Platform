"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import React, { useState, useEffect } from "react";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SigninWithPassword() {
  const [data, setData] = useState({
    email: process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "",
    password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
    remember: false,
  });
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(`Sign-in failed: ${errorParam}`);
      setLoading(false);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch("/api/auth/csrf");
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "http://localhost:3000/",
      });

      console.log("Google Sign-In Result:", result);

      setLoading(false);

      if (result?.error) {
        setError(`Sign-in failed: ${result.error}`);
      } else if (result?.url) {
        console.log("Redirecting to:", result.url);
        window.location.href = result.url;
      } else {
        console.log("No URL in result, redirecting to /");
        router.push("/");
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setLoading(false);
      setError(err.message || "Failed to initiate Google sign-in");
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch("/api/auth/csrf");
      const result = await signIn("facebook", {
        redirect: false,
        callbackUrl: "http://localhost:3000/",
      });

      console.log("Facebook Sign-In Result:", result);

      setLoading(false);

      if (result?.error) {
        setError(`Sign-in failed: ${result.error}`);
      } else if (result?.url) {
        console.log("Redirecting to:", result.url);
        window.location.href = result.url;
      } else {
        console.log("No URL in result, redirecting to /");
        router.push("/");
      }
    } catch (err: any) {
      console.error("Facebook Sign-In Error:", err);
      setLoading(false);
      setError(err.message || "Failed to initiate Facebook sign-in");
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch("/api/auth/csrf");
      const result = await signIn("github", {
        redirect: false,
        callbackUrl: "http://localhost:3000/",
      });

      console.log("GitHub Sign-In Result:", result);

      setLoading(false);

      if (result?.error) {
        setError(`Sign-in failed: ${result.error}`);
      } else if (result?.url) {
        console.log("Redirecting to:", result.url);
        window.location.href = result.url;
      } else {
        console.log("No URL in result, redirecting to /");
        router.push("/");
      }
    } catch (err: any) {
      console.error("GitHub Sign-In Error:", err);
      setLoading(false);
      setError(err.message || "Failed to initiate GitHub sign-in");
    }
  };

  const handleLinkedInSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch("/api/auth/csrf");
      const result = await signIn("linkedin", {
        redirect: false,
        callbackUrl: "http://localhost:3000/",
      });

      console.log("LinkedIn Sign-In Result:", result);

      setLoading(false);

      if (result?.error) {
        setError(`Sign-in failed: ${result.error}`);
      } else if (result?.url) {
        console.log("Redirecting to:", result.url);
        window.location.href = result.url;
      } else {
        console.log("No URL in result, redirecting to /");
        router.push("/");
      }
    } catch (err: any) {
      console.error("LinkedIn Sign-In Error:", err);
      setLoading(false);
      setError(err.message || "Failed to initiate LinkedIn sign-in");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const result = await response.json();

      setLoading(false);

      if (!response.ok) {
        setError(result.error || "Failed to send reset email");
      } else {
        setResetMessage("A password reset link has been sent to your email.");
        setShowResetForm(false);
        setResetEmail("");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Failed to send reset email");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white dark:bg-gray-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-lg transition-all duration-300">
      {!showResetForm ? (
        <div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/10 to-primary-dark/10 rounded-2xl mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg"></div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          <div className="mb-8">
            <p className="text-center text-gray-600 dark:text-gray-400 font-medium mb-4">
              Continue with
            </p>
            <div className="flex justify-center gap-10">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                disabled={loading}
                aria-label="Sign in with Google"
              >
                {loading ? (
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-gray-400 border-t-transparent" />
                ) : (
                  <svg
                    className="w-7 h-7 group-hover:scale-110 transition-transform duration-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.31 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                disabled={loading}
                aria-label="Sign in with Facebook"
              >
                {loading ? (
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-gray-400 border-t-transparent" />
                ) : (
                  <svg
                    className="w-7 h-7 group-hover:scale-110 transition-transform duration-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                      fill="#1877F2"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={handleGitHubSignIn}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                disabled={loading}
                aria-label="Sign in with GitHub"
              >
                {loading ? (
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-gray-400 border-t-transparent" />
                ) : (
                  <svg
                    className="w-7 h-7 group-hover:scale-110 transition-transform duration-200 text-gray-900 dark:text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={handleLinkedInSignIn}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                disabled={loading}
                aria-label="Sign in with LinkedIn"
              >
                {loading ? (
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-gray-400 border-t-transparent" />
                ) : (
                  <svg
                    className="w-7 h-7 group-hover:scale-110 transition-transform duration-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0zM7.12 20.45H3.56V9.06h3.56v11.39zM5.34 7.54c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zm15.11 12.91h-3.56v-6.14c0-1.46-.52-2.45-1.83-2.45-1 0-1.59.67-1.85 1.32-.09.23-.11.55-.11.87v6.4h-3.56V9.06h3.42v1.54h.05c.47-.89 1.62-2.17 3.62-2.17 2.64 0 4.62 1.72 4.62 5.43v6.59z"
                      fill="#0077B5"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-gray-dark px-4 text-gray-500 dark:text-gray-400 font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="relative p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {error}
                </div>
              </div>
            )}

            <InputGroup
              type="email"
              label="Email Address"
              className=""
              inputClassName="w-full px-4 py-3.5 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
              placeholder="Enter your email"
              name="email"
              handleChange={handleChange}
              value={data.email}
              icon={<EmailIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" />}
            />

            <InputGroup
              type="password"
              label="Password"
              className=""
              inputClassName="w-full px-4 py-3.5 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
              placeholder="Enter your password"
              name="password"
              handleChange={handleChange}
              value={data.password}
              icon={<PasswordIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" />}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember me"
                name="remember"
                withIcon="check"
                minimal
                radius="md"
                className="text-gray-700 dark:text-gray-300"
                onChange={(e) =>
                  setData({
                    ...data,
                    remember: e.target.checked,
                  })
                }
              />
              <button
                type="button"
                onClick={() => setShowResetForm(true)}
                className="text-primary hover:text-primary-dark font-medium transition-colors duration-200 text-sm"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-primary-dark hover:from-primary-dark hover:via-primary hover:to-primary py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white/30 border-t-white" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Reset Password
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <InputGroup
              type="email"
              label="Email Address"
              className=""
              inputClassName="w-full px-4 py-3.5 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
              placeholder="Enter your email"
              name="resetEmail"
              handleChange={(e) => setResetEmail(e.target.value)}
              value={resetEmail}
              icon={<EmailIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" />}
            />

            {error && (
              <div className="relative p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {error}
                </div>
              </div>
            )}

            {resetMessage && (
              <div className="relative p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {resetMessage}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-primary-dark hover:from-primary-dark hover:via-primary hover:to-primary py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white/30 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetForm(false);
                  setError(null);
                  setResetMessage(null);
                  setResetEmail("");
                }}
                className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 