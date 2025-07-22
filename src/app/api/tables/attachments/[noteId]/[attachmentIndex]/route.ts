import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import path from "path";
import fs from "fs/promises";

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/");
  const noteId = pathSegments[pathSegments.length - 2]; // /api/tables/attachments/[noteId]/[attachmentIndex]
  const attachmentIndex = pathSegments[pathSegments.length - 1];

  console.log(`Received DELETE request for /api/tables/attachments/${noteId}/${attachmentIndex}`);
  console.log("Extracted noteId:", noteId);
  console.log("Extracted attachmentIndex:", attachmentIndex);

  // Validate noteId and attachmentIndex
  if (!noteId || typeof noteId !== "string" || !ObjectId.isValid(noteId)) {
    console.log("Invalid noteId:", noteId);
    return NextResponse.json({ message: "Invalid noteId" }, { status: 400 });
  }
  const index = parseInt(attachmentIndex, 10);
  if (isNaN(index) || index < 0) {
    console.log("Invalid attachment index:", attachmentIndex);
    return NextResponse.json({ message: "Invalid attachment index" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase("learning_platform");
    console.log("Connected to database");

    const session = await getServerSession(authOptions);
    console.log("Session:", session ? "Found" : "Not found", session?.user?.id || "No user ID");

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log(`Looking up note with ID: ${noteId}`);
    const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });
    if (!note) {
      console.log("Note not found: ID", noteId);
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }
    console.log("Note found:", note._id, "Attachments:", note.attachments.length);

    if (note.createdById !== session.user.id) {
      console.log("Unauthorized: User", session.user.id, "is not creator", note.createdById);
      return NextResponse.json({ message: "You are not authorized to delete this attachment" }, { status: 403 });
    }

    if (!note.attachments || note.attachments.length <= index) {
      console.log("Attachment not found: Index", index, "Attachments length", note.attachments?.length || 0);
      return NextResponse.json({ message: "Attachment not found" }, { status: 404 });
    }

    const attachmentToDelete = note.attachments[index];
    console.log("Deleting attachment:", attachmentToDelete);
    const filePath = path.join(process.cwd(), "public", attachmentToDelete.url);
    try {
      await fs.access(filePath); // Check if file exists
      await fs.unlink(filePath);
      console.log("File deleted from filesystem:", filePath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("File not found on filesystem, proceeding with deletion:", filePath);
      } else {
        console.error("Error deleting file from filesystem:", error.message);
      }
    }

    note.attachments.splice(index, 1);
    note.updatedAt = new Date().toISOString();

    const updateResult = await db.collection("Notes").updateOne(
      { _id: new ObjectId(noteId) },
      { $set: { attachments: note.attachments, updatedAt: note.updatedAt } }
    );

    if (updateResult.modifiedCount === 0) {
      console.error("Failed to update note in database:", noteId);
      return NextResponse.json({ message: "Failed to update note in database" }, { status: 500 });
    }

    console.log("Note updated, attachment removed:", noteId);
    return NextResponse.json(note, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting attachment:", error.message);
    return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
  }
}