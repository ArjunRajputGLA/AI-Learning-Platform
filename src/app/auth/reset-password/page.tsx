"use client";

import Breadcrumb from "@/components/Auth/Breadcrumbs/Breadcrumb";
import { PasswordIcon } from "@/assets/icons";
import InputGroup from "@/components/FormElements/InputGroup";
import { MongoClient } from "mongodb";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import bcrypt from "bcrypt";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setError("Invalid or missing token/email.");
        return;
      }

      try {
        const response = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, email }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Invalid or expired token.");
        } else {
          setTokenValid(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to validate token.");
      }
    };

    validateToken();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, email, password }),
      });

      const result = await response.json();

      setLoading(false);

      if (!response.ok) {
        setError(result.error || "Failed to reset password.");
      } else {
        setSuccess("Password reset successfully! Redirecting to sign-in...");
        setTimeout(() => router.push("/auth/sign-in"), 3000);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Failed to reset password.");
    }
  };

  return (
    <>
      <Breadcrumb pageName="Reset Password" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-wrap items-center">
          <div className="w-full xl:w-1/2">
            <div className="w-full p-4 sm:p-12.5 xl:p-15">
              <h2 className="mb-4 text-2xl font-bold text-dark dark:text-white">
                Reset Your Password
              </h2>

              {!tokenValid ? (
                <div className="text-red-500">{error || "Validating token..."}</div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <InputGroup
                    type="password"
                    label="New Password"
                    className="mb-4 [&_input]:py-[15px]"
                    placeholder="Enter new password"
                    name="password"
                    handleChange={(e) => setPassword(e.target.value)}
                    value={password}
                    icon={<PasswordIcon />}
                  />

                  <InputGroup
                    type="password"
                    label="Confirm Password"
                    className="mb-5 [&_input]:py-[15px]"
                    placeholder="Confirm new password"
                    name="confirmPassword"
                    handleChange={(e) => setConfirmPassword(e.target.value)}
                    value={confirmPassword}
                    icon={<PasswordIcon />}
                  />

                  {error && (
                    <div className="mb-4 text-red-500 text-center">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 text-green-500 text-center">
                      {success}
                    </div>
                  )}

                  <div className="mb-4.5">
                    <button
                      type="submit"
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90"
                      disabled={loading}
                    >
                      Reset Password
                      {loading && (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent dark:border-primary dark:border-t-transparent" />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="hidden w-full p-7.5 xl:block xl:w-1/2">
            <div className="custom-gradient-1 overflow-hidden rounded-2xl px-12.5 pt-12.5 dark:!bg-dark-2 dark:bg-none">
              <p className="mb-3 text-xl font-medium text-dark dark:text-white">
                Reset your password
              </p>
              <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white sm:text-heading-3">
                Set a New Password
              </h1>
              <p className="w-full max-w-[375px] font-medium text-dark-4 dark:text-dark-6">
                Enter a new password for your Smart AI Classroom account.
              </p>
              <div className="mt-31">
                <img
                  src="/images/grids/grid-02.svg"
                  alt="Grid"
                  className="mx-auto dark:opacity-30"
                  width={405}
                  height={325}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}