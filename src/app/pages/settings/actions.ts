"use server";

import { MongoClient, ObjectId } from "mongodb";

// Reuse the clientPromise from [...nextauth]/route.ts
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);
const clientPromise = client.connect();

export async function getUserById(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db("learning_platform");
    const user = await db.collection("Users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      throw new Error("User not found with ID: " + userId);
    }

    return {
      id: user._id.toString(),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "student",
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split("T")[0] : "",
      updatedAt: user.lastActive ? new Date(user.lastActive).toISOString().split("T")[0] : "", // Use lastActive as updatedAt
      profilePicture: user.profilePicture || "/images/user/user-03.png",
      points: user.points || 0,
      preferences: user.preferences || {
        notifications: true,
        theme: "dark",
        language: "en",
      },
      // Fields not in schema but returned for compatibility
      phoneNumber: "", // Not in schema, return empty string
    };
  } catch (error: any) {
    console.error("Error fetching user:", error.message, error.stack);
    throw new Error(error.message || "Failed to fetch user");
  }
  // No need to close the client since we're reusing clientPromise
}

export async function updateUser(userId: string, updatedData: any) {
  try {
    const client = await clientPromise;
    const db = client.db("learning_platform");
    const result = await db.collection("Users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          preferences: updatedData.preferences,
          lastActive: new Date(), // Update lastActive instead of updatedAt
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found with ID: " + userId);
    }

    console.log("User updated successfully:", { userId, updatedData });
    return { success: true, message: "User updated successfully" };
  } catch (error: any) {
    console.error("Error updating user:", error.message, error.stack);
    throw new Error(error.message || "Failed to update user");
  }
  // No need to close the client since we're reusing clientPromise
}

export async function updateUserProfilePicture(userId: string, profilePictureUrl: string) {
  try {
    const client = await clientPromise;
    const db = client.db("learning_platform");
    const result = await db.collection("Users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          profilePicture: profilePictureUrl,
          lastActive: new Date(), // Update lastActive instead of updatedAt
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found with ID: " + userId);
    }

    console.log("Profile picture updated successfully:", { userId, profilePictureUrl });
    return { success: true, message: "Profile picture updated successfully" };
  } catch (error: any) {
    console.error("Error updating profile picture:", error.message, error.stack);
    throw new Error(error.message || "Failed to update profile picture");
  }
  // No need to close the client since we're reusing clientPromise
}