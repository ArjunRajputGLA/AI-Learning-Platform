"use client";
import { signOut } from "next-auth/react";
import * as Icons from "./icons";

export const LogoutButton = () => {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/sign-in" });
  };

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3.5 py-2 px-3 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
    >
      <Icons.Authentication className="size-6 shrink-0" />
      <span>Log Out</span>
    </button>
  );
}; 