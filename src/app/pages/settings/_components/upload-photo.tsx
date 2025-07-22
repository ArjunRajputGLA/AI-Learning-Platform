"use client";

import { UploadIcon } from "@/assets/icons";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { getUserById, updateUserProfilePicture } from "../actions";

export function UploadPhotoForm() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    profilePicture: "/images/user/default-user-icon.avif",
  });
  const [isClient, setIsClient] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progressData] = useState({
    currentLevel: 2,
    totalLevels: 5,
    checkpoints: [
      { id: 1, name: 'Beginner', completed: true, description: 'Started your learning journey' },
      { id: 2, name: 'Explorer', completed: true, description: 'Completed 5 lessons' },
      { id: 3, name: 'Achiever', completed: false, description: 'Finished first course' },
      { id: 4, name: 'Master', completed: false, description: 'Completed 3 courses' },
      { id: 5, name: 'Expert', completed: false, description: 'Achieved all certifications' },
    ]
  });

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
        setUser({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          profilePicture: userData.profilePicture || "/images/user/default-user-icon.avif",
        });
      } catch (err: any) {
        // Fallback to session data
        const nameParts = session.user?.name?.split(" ") || ["", ""];
        setUser({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          profilePicture: session.user?.image || "/images/user/default-user-icon.avif",
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

  // Add preview when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.match('image.*')) {
        setUpdateError('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);
    setUploadProgress(0);

    if (!selectedFile) {
      setUpdateError("Please select a file to upload.");
      return;
    }

    if (!session?.user?.id) {
      setUpdateError("User not authenticated.");
      return;
    }

    const formData = new FormData();
    formData.append("profilePicture", selectedFile);
    formData.append("userId", session.user.id);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(Math.round(progress));
        },
      });

      // Log response details for debugging
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers.get("content-type"));
      const rawResponse = await response.text();
      console.log("Raw response:", rawResponse);

      // Attempt to parse as JSON regardless of content-type
      let result;
      try {
        result = JSON.parse(rawResponse);
      } catch (parseError) {
        throw new Error("Failed to parse response as JSON: " + rawResponse);
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload file.");
      }

      // Update the profile picture in the database using updateUserProfilePicture
      await updateUserProfilePicture(session.user.id, result.profilePicture);

      setUser({ ...user, profilePicture: result.profilePicture });
      setUpdateSuccess("Profile photo updated successfully!");
      setSelectedFile(null);
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update profile photo. Please try again.");
    } finally {
      setUploadProgress(0);
    }
  };

  // Render a placeholder during loading
  if (!isClient || status === "loading" || loading) {
    return (
      <ShowcaseSection title="Your Photo" className="!p-7">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="space-y-2">
              <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
          </div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex justify-end">
            <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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

  // Use the profile picture from the user data, falling back to the default only if empty
  const imageSrc = user.profilePicture && user.profilePicture.trim() !== ""
    ? user.profilePicture
    : "/images/user/default-user-icon.avif";

  return (
    <ShowcaseSection title="Your Photo" className="!p-7">
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
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="relative">
            <Image
              src={imageSrc}
              width={64}
              height={64}
              alt={`${user.firstName} ${user.lastName}`}
              className="size-16 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm"
              quality={90}
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your profile picture
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div 
          className={`relative rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 hover:border-primary dark:hover:border-primary hover:bg-primary/5'
            }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            name="profilePicture"
            id="profilePicture"
            accept="image/png, image/jpg, image/jpeg"
            hidden
            onChange={handleFileChange}
          />

          <label
            htmlFor="profilePicture"
            className="flex cursor-pointer flex-col items-center justify-center p-8 sm:p-12"
          >
            {previewUrl ? (
              <div className="relative w-32 h-32 mb-6 group">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Click to change</span>
                </div>
              </div>
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mb-6 shadow-sm">
                <UploadIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
            )}

            <div className="text-center">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                <span className="text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                PNG, JPG, or JPEG (max. 800×800px, 5MB)
              </p>
            </div>
          </label>

          {uploadProgress > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Learning Progress Section */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                Learning Progress
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track your learning milestones
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Level {progressData.currentLevel}/{progressData.totalLevels}
              </div>
            </div>
          </div>

          {/* Progress Track Container */}
          <div className="relative mb-12">
            {/* Background Track */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-4">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${(progressData.currentLevel / progressData.totalLevels) * 100}%`
                }}
              />
            </div>

            {/* Checkpoints Container */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full px-4">
              <div className="relative w-full">
                {progressData.checkpoints.map((checkpoint, index) => {
                  const position = index === 0 ? 0 : index === progressData.checkpoints.length - 1 ? 100 : (index / (progressData.checkpoints.length - 1)) * 100;
                  const isActive = index === progressData.currentLevel - 1;
                  
                  return (
                    <div 
                      key={checkpoint.id}
                      className="absolute group"
                      style={{ 
                        left: `${position}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {/* Checkpoint Marker */}
                      <div className="relative flex flex-col items-center">
                        <div 
                          className={`
                            size-5 rounded-full border-3 transition-all duration-300 relative z-10
                            ${checkpoint.completed 
                              ? 'bg-primary border-primary shadow-lg' 
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
                            ${isActive 
                              ? 'ring-4 ring-primary/30 scale-125' 
                              : 'hover:scale-110'}
                          `}
                        >
                          {checkpoint.completed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Checkpoint Label */}
                        <div className="mt-4 text-center">
                          <div className={`
                            text-xs font-medium mb-1 transition-colors duration-200
                            ${checkpoint.completed ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}
                          `}>
                            {checkpoint.name}
                          </div>
                        </div>

                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none">
                          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                            <div className="font-medium">{checkpoint.name}</div>
                            <div className="text-gray-300 text-[10px] mt-0.5">{checkpoint.description}</div>
                          </div>
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700 mx-auto" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Level</div>
              <div className="font-semibold text-gray-800 dark:text-white">
                {progressData.checkpoints[progressData.currentLevel - 1]?.name}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Milestone</div>
              <div className="font-semibold text-gray-800 dark:text-white">
                {progressData.checkpoints[progressData.currentLevel]?.name || 'Complete!'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-dark rounded-lg hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            type="submit"
            disabled={!selectedFile || uploadProgress > 0}
          >
            {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Save Changes'}
          </button>
        </div>
      </form>
    </ShowcaseSection>
  );
}