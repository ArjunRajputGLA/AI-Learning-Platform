import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { unlink } from "fs/promises";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const params = await context.params;
    const noteId = params.id;

    console.log("PUT /api/tables/[id]: noteId =", noteId);
    console.log("PUT /api/tables/[id]: ObjectId.isValid(noteId) =", ObjectId.isValid(noteId));

    if (!noteId || !ObjectId.isValid(noteId)) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase("learning_platform");
    const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    console.log("Checking authorization on backend (PUT):", {
      noteId,
      sessionUserId: userId,
      noteCreatedById: note.createdById,
      isMatch: note.createdById === userId,
      fullSession: session,
    });

    if (note.createdById !== userId) {
      return NextResponse.json({ message: "Unauthorized to edit this note" }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get("title")?.toString();
    const content = formData.get("content")?.toString();
    const tagsString = formData.get("tags")?.toString();
    const files = formData.getAll("files") as File[];

    if (!title || !content) {
      return NextResponse.json({ message: "Title and content are required" }, { status: 400 });
    }

    const tags = tagsString
      ? tagsString.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0)
      : note.tags;

    const uploadDir = path.join(process.cwd(), "public/uploads");
    let attachments = [...(note.attachments || [])];

    if (files && files.length > 0) {
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        console.error("Error creating upload directory:", error);
        return NextResponse.json({ message: "Failed to create upload directory" }, { status: 500 });
      }

      const totalAttachments = attachments.length + files.filter((file) => file.size > 0).length;
      if (totalAttachments > 5) {
        return NextResponse.json({ message: "Maximum 5 attachments allowed" }, { status: 400 });
      }

      for (const file of files) {
        if (file.size > 0) {
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = path.join(uploadDir, fileName);
          try {
            const bytes = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));
            attachments.push({
              filename: file.name,
              url: `/uploads/${fileName}`,
              type: file.type,
            });
          } catch (error) {
            console.error(`Error writing file ${file.name}:`, error);
            return NextResponse.json({ message: `Failed to upload file: ${file.name}` }, { status: 500 });
          }
        }
      }
    }

    const updateFields = {
      title,
      content,
      tags,
      attachments,
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("Notes").findOneAndUpdate(
      { _id: new ObjectId(noteId) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result.value) {
      console.error("Failed to update note in database:", { noteId, updateFields });
      return NextResponse.json({ message: "Failed to update note in database" }, { status: 500 });
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/tables/[id]:", error);
    return NextResponse.json({ message: "Server error", details: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const params = await context.params;
    const noteId = params.id;

    console.log("DELETE /api/tables/[id]: noteId =", noteId);
    console.log("DELETE /api/tables/[id]: ObjectId.isValid(noteId) =", ObjectId.isValid(noteId));

    if (!noteId || !ObjectId.isValid(noteId)) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase("learning_platform");
    const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    console.log("Checking authorization on backend (DELETE):", {
      noteId,
      sessionUserId: userId,
      noteCreatedById: note.createdById,
      isMatch: note.createdById === userId,
      fullSession: session,
    });

    if (note.createdById !== userId) {
      return NextResponse.json({ message: "Forbidden: You can only delete your own notes" }, { status: 403 });
    }

    // Delete attachments from the filesystem
    if (note.attachments && note.attachments.length > 0) {
      for (const attachment of note.attachments) {
        const filePath = path.join(process.cwd(), "public", attachment.url);
        try {
          await unlink(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
          // Continue deletion even if file removal fails
        }
      }
    }

    // Delete the note from the database
    const deleteResult = await db.collection("Notes").deleteOne({ _id: new ObjectId(noteId) });

    if (deleteResult.deletedCount === 0) {
      console.error("Failed to delete note from database:", { noteId });
      return NextResponse.json({ message: "Failed to delete note from database" }, { status: 500 });
    }

    console.log(`Note deleted successfully: ${noteId}`);
    return NextResponse.json({ message: "Note deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/tables/[id]:", error);
    return NextResponse.json({ message: "Server error", details: (error as Error).message }, { status: 500 });
  }
}