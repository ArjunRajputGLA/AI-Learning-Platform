"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import type { Metadata } from "next";
import InputGroup from "@/components/FormElements/InputGroup";
import Breadcrumb from "@/components/Auth/Breadcrumbs/Breadcrumb";
import Image from "next/image";

export default function SignUp() {
  const [data, setData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to register");
      }

      router.push("/auth/sign-in");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Sign Up" />

      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl backdrop-blur-sm border border-gray-100 dark:bg-gray-dark dark:shadow-card dark:border-gray-800 transition-all duration-300 hover:shadow-3xl">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-wrap items-stretch min-h-[700px] relative z-10">
          <div className="w-full xl:w-1/2 flex items-center">
            <div className="w-full p-6 sm:p-12 xl:p-16 relative">
              {/* Subtle gradient overlay for form section */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-green-50/30 to-blue-50/20 dark:from-transparent dark:via-gray-800/20 dark:to-gray-900/10 rounded-l-2xl xl:rounded-r-none xl:rounded-l-2xl"></div>
              
              <div className="w-full max-w-md mx-auto relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/10 to-primary-dark/10 rounded-2xl mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg"></div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Create Account
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Join us today and get started in minutes
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputGroup
                      type="text"
                      label="First Name"
                      className=""
                      inputClassName="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                      placeholder="John"
                      name="firstName"
                      handleChange={handleChange}
                      value={data.firstName}
                    />
                    <InputGroup
                      type="text"
                      label="Last Name"
                      className=""
                      inputClassName="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                      placeholder="Doe"
                      name="lastName"
                      handleChange={handleChange}
                      value={data.lastName}
                    />
                  </div>

                  <InputGroup
                    type="email"
                    label="Email Address"
                    className=""
                    inputClassName="w-full px-4 py-3.5 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    placeholder="john@example.com"
                    name="email"
                    handleChange={handleChange}
                    value={data.email}
                    icon={
                      <EmailIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" />
                    }
                  />

                  <InputGroup
                    type="password"
                    label="Password"
                    className=""
                    inputClassName="w-full px-4 py-3.5 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    placeholder="••••••••"
                    name="password"
                    handleChange={handleChange}
                    value={data.password}
                    icon={
                      <PasswordIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" />
                    }
                  />

                  {error && (
                    <div className="relative p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {error}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-primary-dark hover:from-primary-dark hover:via-primary hover:to-primary py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    disabled={loading}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white/30 border-t-white" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-gray-dark text-gray-500 dark:text-gray-400">
                        Already have an account?
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/auth/sign-in"
                    className="mt-4 inline-flex items-center gap-2 text-primary hover:text-primary-dark font-medium transition-colors duration-200 group"
                  >
                    Sign in instead
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden w-full xl:block xl:w-1/2 relative">
            <div className="relative h-full min-h-[700px] overflow-hidden">
              {/* Enhanced gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-blue-700 to-purple-800 dark:from-gray-800 dark:via-gray-900 dark:to-black"></div>
              
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 via-transparent to-blue-500/20 animate-pulse"></div>
              
              {/* Geometric patterns */}
              <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full animate-spin-slow"></div>
              <div className="absolute top-32 right-20 w-12 h-12 border border-white/10 rounded-lg rotate-45"></div>
              <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
              
              <div className="relative z-10 flex flex-col justify-center h-full px-12 py-16">
                <Link className="mb-12 inline-block group transition-transform duration-200 hover:scale-105" href="/">
                  <div className="relative">
                    <Image
                      className="hidden dark:block drop-shadow-lg"
                      src={"/images/logo/sidebar-logo-white.png"}
                      alt="Logo"
                      width={176}
                      height={32}
                    />
                    <Image
                      className="dark:hidden drop-shadow-lg"
                      src={"/images/logo/sidebar-logo-white.png"}
                      alt="Logo"
                      width={176}
                      height={32}
                    />
                    <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-xl"></div>
                  </div>
                </Link>

                <div className="space-y-6">
                  <h1 className="text-4xl font-bold text-white leading-tight sm:text-5xl bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
                    Start your journey
                    <span className="block text-white/90">with us today</span>
                  </h1>

                  <p className="text-lg font-medium text-white/80 max-w-[400px] leading-relaxed">
                    Create your account in seconds and unlock powerful features designed to help you succeed.
                  </p>

                  <div className="flex items-center gap-6 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-white/80">Free forever</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-white/80">No setup required</span>
                    </div>
                  </div>
                </div>

                <div className="mt-16 relative">
                  {/* Enhanced decorative elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border border-white/10 rounded-full animate-pulse"></div>
                    <div className="absolute w-48 h-48 border border-white/20 rounded-full animate-ping"></div>
                    <div className="absolute w-32 h-32 bg-white/5 rounded-full backdrop-blur-sm"></div>
                  </div>
                  
                  <Image
                    src={"/images/grids/grid-02.svg"}
                    alt="Decorative Grid"
                    width={405}
                    height={325}
                    className="relative z-10 mx-auto opacity-80 dark:opacity-40 drop-shadow-2xl transform hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Floating particles effect */}
                  <div className="absolute top-10 left-10 w-2 h-2 bg-white/30 rounded-full animate-bounce"></div>
                  <div className="absolute top-20 right-16 w-1 h-1 bg-white/40 rounded-full animate-ping"></div>
                  <div className="absolute bottom-16 left-20 w-3 h-3 bg-white/20 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </>
  );
}