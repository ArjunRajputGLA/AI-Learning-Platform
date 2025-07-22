"use client"; // Mark as client component to use hooks

import Signin from "@/components/Auth/Signin";
import Breadcrumb from "@/components/Auth/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for callbackUrl to detect if this is part of a redirect loop
  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl");
    // If the callbackUrl points to /auth/signin, redirect to avoid loop
    if (callbackUrl && callbackUrl.includes("/auth/signin")) {
      router.replace("/auth/signin");
    }
  }, [searchParams, router]);

  return (
    <>
      <Breadcrumb pageName="Sign In" />

      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl backdrop-blur-sm border border-gray-100 dark:bg-gray-dark dark:shadow-card dark:border-gray-800 transition-all duration-300 hover:shadow-3xl min-h-[600px]">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-wrap items-center relative z-10">
          <div className="w-full xl:w-1/2">
            <div className="w-full p-6 sm:p-12 xl:p-16 relative">
              {/* Subtle gradient overlay for form section */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/30 to-indigo-50/20 dark:from-transparent dark:via-gray-800/20 dark:to-gray-900/10 rounded-l-2xl xl:rounded-r-none xl:rounded-l-2xl"></div>
              <div className="relative z-10">
                <Signin />
              </div>
            </div>
          </div>

          <div className="hidden w-full xl:block xl:w-1/2 relative">
            <div className="relative h-full min-h-[1000px] overflow-hidden">
              {/* Enhanced gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-gray-800 dark:via-gray-900 dark:to-black"></div>
              
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-purple-500/20 animate-pulse"></div>
              
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
                  <p className="text-lg font-semibold text-white/90 tracking-wide">
                    Sign in to your account
                  </p>

                  <h1 className="text-4xl font-bold text-white leading-tight sm:text-5xl bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Welcome Back!
                  </h1>

                  <p className="text-lg font-medium text-white/80 max-w-[400px] leading-relaxed">
                    Please sign in to your account by completing the necessary
                    fields below
                  </p>
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