"use client";

import { EmailIcon, UserIcon } from "@/assets/icons";
import InputGroup from "@/components/FormElements/InputGroup";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { getUserById, updateUser } from "../actions";

export function PersonalInfoForm() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "",
    createdAt: "",
    updatedAt: "",
    points: 0,
    preferences: {
      notifications: true,
      theme: "dark",
      language: "en",
    },
  });
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      if (status === "loading" || !session?.user?.id) {
        console.log("Session not ready:", { status, session });
        return;
      }

      console.log("Fetching user data for ID:", session.user.id);

      try {
        setLoading(true);
        const userData = await getUserById(session.user.id);
        console.log("User data from DB:", userData);
        setUser(userData);
      } catch (err: any) {
        // Fallback to session data
        const nameParts = session.user?.name?.split(" ") || ["", ""];
        setUser({
          email: session.user?.email || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          role: "student", // Default role
          createdAt: "",
          updatedAt: "",
          points: 0,
          preferences: {
            notifications: true,
            theme: "dark",
            language: "en",
          },
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [session, status]);

  // Handle client-side mounting to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const updatedUser = {
      ...user,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      preferences: {
        ...user.preferences,
        language: formData.get("language") as string,
        theme: formData.get("theme") as string,
        notifications: formData.get("notifications") === "enabled",
      },
    };

    try {
      await updateUser(session!.user.id, updatedUser);
      setUser(updatedUser); // Update local state
      setUpdateSuccess("Profile updated successfully!");
    } catch (err: any) {
      setUpdateError("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date to a stable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString || 'Not available';
    }
  };

  // Calculate days since joining
  const getDaysSinceJoining = (dateString: string) => {
    try {
      const joinDate = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - joinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 0;
    }
  };

  // Render a placeholder during loading
  if (!isClient || status === "loading" || loading) {
    return (
      <ShowcaseSection title="Personal Information" className="!p-7">
        <div className="animate-pulse space-y-6">
          {/* Profile header skeleton */}
          <div className="flex items-center gap-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <div className="size-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="space-y-2">
              <div className="w-32 h-5 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
              <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
            </div>
          </div>
          
          {/* Form fields skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          
          <div className="flex justify-end">
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </ShowcaseSection>
    );
  }

  if (!session) {
    return (
      <ShowcaseSection title="Authentication Required" className="!p-7">
        <div className="text-center py-8">
          <div className="text-gray-600 dark:text-gray-400 mb-4">
            Please sign in to view your settings.
          </div>
        </div>
      </ShowcaseSection>
    );
  }

  return (
    <ShowcaseSection title="Personal Information" className="!p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success/Error Messages */}
        {updateSuccess && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              {updateSuccess}
            </div>
          </div>
        )}
        {updateError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              {updateError}
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div className="size-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {user.role} • {user.points} points
            </p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group">
              <InputGroup
                className="w-full"
                type="text"
                name="firstName"
                label="First Name"
                placeholder="Enter your first name"
                defaultValue={user.firstName}
                icon={<UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-focus-within:text-primary transition-colors" />}
                iconPosition="left"
                height="sm"
                inputClassName="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
              />
            </div>

            <div className="group">
              <InputGroup
                className="w-full"
                type="text"
                name="lastName"
                label="Last Name"
                placeholder="Enter your last name"
                defaultValue={user.lastName}
                icon={<UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-focus-within:text-primary transition-colors" />}
                iconPosition="left"
                height="sm"
                inputClassName="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
              />
            </div>
          </div>

          <div className="group">
            <InputGroup
              className="w-full"
              type="email"
              name="email"
              label="Email Address"
              placeholder="email@example.com"
              defaultValue={user.email}
              icon={<EmailIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
              iconPosition="left"
              height="sm"
              disabled
              inputClassName="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email cannot be changed. Contact support if you need to update this.
            </p>
          </div>
        </div>

        {/* Read-only Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
            Account Information
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group relative">
              <InputGroup
                className="w-full"
                type="text"
                name="role"
                label="Role"
                defaultValue={user.role}
                icon={
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-primary" />
                  </div>
                }
                iconPosition="left"
                height="sm"
                disabled
                inputClassName="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed capitalize"
              />
            </div>

            <div className="group relative">
              <InputGroup
                className="w-full"
                type="text"
                name="points"
                label="Total Points"
                defaultValue={user.points.toLocaleString()}
                icon={
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                }
                iconPosition="left"
                height="sm"
                disabled
                inputClassName="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group relative">
              <InputGroup
                className="w-full"
                type="text"
                name="createdAt"
                label="Member Since"
                defaultValue={formatDate(user.createdAt)}
                icon={
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                }
                iconPosition="left"
                height="sm"
                disabled
                inputClassName="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div className="group relative">
              <InputGroup
                className="w-full"
                type="text"
                name="lastActive"
                label="Last Active"
                defaultValue={formatDate(user.updatedAt)}
                icon={
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                }
                iconPosition="left"
                height="sm"
                disabled
                inputClassName="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
                <div className="font-semibold text-gray-800 dark:text-white">{user.points.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Days Active</div>
                <div className="font-semibold text-gray-800 dark:text-white">{getDaysSinceJoining(user.createdAt)}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Account Type</div>
                <div className="font-semibold text-gray-800 dark:text-white capitalize">{user.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={() => {
              // Reset form logic if needed
              window.location.reload();
            }}
          >
            Reset
          </button>
          <button
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-dark rounded-lg hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </ShowcaseSection>
  );
}