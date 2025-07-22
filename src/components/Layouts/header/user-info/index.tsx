"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LogOutIcon, SettingsIcon } from "./icons";
import { useSession, signOut } from "next-auth/react";
import { getUserById } from "@/app/pages/settings/actions";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    profilePicture: "/images/user/default-user-icon.png", // Correct path for Next.js public folder
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback for Next.js Image (state-based)
  const [imgError, setImgError] = useState(false);

  // Fetch user data from the database
  useEffect(() => {
    async function fetchUserData() {
      if (status === "loading" || !session?.user?.id) {
        console.log("Session not ready:", { status, session });
        return;
      }

      console.log("Fetching user data for ID:", session.user.id);

      try {
        setLoading(true);
        const userFromDb = await getUserById(session.user.id);
        console.log("User data from DB:", userFromDb);
        setUserData({
          name: `${userFromDb.firstName} ${userFromDb.lastName}` || session.user?.name || "User",
          email: userFromDb.email || session.user?.email || "user@example.com",
          profilePicture: userFromDb.profilePicture || session.user?.image || "/images/user/default-user-icon.png", // Fallback image
        });
      } catch (err: any) {
        setError("Failed to load user data from database.");
        // Fallback to session data
        setUserData({
          name: session.user?.name || "User",
          email: session.user?.email || "user@example.com",
          profilePicture: session.user?.image || "/images/user/default-user-icon.png", // Fallback image
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [session, status]);

  // If the session is loading, render a placeholder
  if (status === "loading") {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="hidden lg:block w-24 h-6 rounded bg-gray-200 animate-pulse"></div>
      </div>
    );
  }

  // If the user is not logged in, render nothing
  if (!session) {
    return null;
  }

  // If still loading user data, render a placeholder
  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="hidden lg:block w-24 h-6 rounded bg-gray-200 animate-pulse"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/auth/sign-in";
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          <Image
            src={imgError ? "/images/user/default-user-icon.png" : userData.profilePicture}
            className="size-12 rounded-full object-cover"
            alt={`Avatar of ${userData.name}`}
            role="presentation"
            width={48}
            height={48}
            onError={() => setImgError(true)}
          />
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{userData.name}</span>
            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>
        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image
            src={imgError ? "/images/user/default-user-icon.png" : userData.profilePicture}
            className="size-12 rounded-full object-cover"
            alt={`Avatar for ${userData.name}`}
            role="presentation"
            width={48}
            height={48}
            onError={() => setImgError(true)}
          />
          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {userData.name}
            </div>
            <div className="leading-none text-gray-6">{userData.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={handleLogout}
          >
            <LogOutIcon />

            <span className="text-base font-medium">Log Out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}