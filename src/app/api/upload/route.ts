import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { updateUserProfilePicture } from "../../pages/settings/actions";

export async function POST(request: Request) {
  console.log("Received POST request to /api/upload");

  try {
    const formData = await request.formData();
    const file = formData.get("profilePicture") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Convert the file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}-${timestamp}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write the file
    await writeFile(filePath, buffer);

    // Update the user's profile picture URL in the database
    const profilePictureUrl = `/uploads/${fileName}`;
    const updatedUser = await updateUserProfilePicture(userId, profilePictureUrl);

    if (!updatedUser) {
      throw new Error("Failed to update user profile in database");
    }

    console.log("Database updated with profile picture URL:", profilePictureUrl);
    return NextResponse.json({ success: true, profilePicture: profilePictureUrl }, { status: 200 });

  } catch (error: any) {
    console.error("Error in /api/upload:", error.message, error.stack);
    return NextResponse.json({ 
      error: "Failed to process upload: " + error.message,
      details: error.stack
    }, { status: 500 });
  }
}
