import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    console.log("GET /api/tables: Starting request handling...");
    const { db } = await connectToDatabase("learning_platform");
    console.log("GET /api/tables: Connected to database");

    const notes = await db.collection("Notes").find({ isPublic: true }).toArray();

    console.log("GET /api/tables: Fetched notes successfully", notes.length);
    return NextResponse.json(notes, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ message: "Server error while fetching notes", error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || !session.user.name) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const username = session.user.name;

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
      : [];

    const { db } = await connectToDatabase("learning_platform");

    const uploadDir = path.join(process.cwd(), "public/uploads");
    const attachments = [];

    if (files && files.length > 0) {
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        console.error("Error creating upload directory:", error);
        return NextResponse.json({ message: "Failed to create upload directory" }, { status: 500 });
      }

      if (files.filter((file) => file.size > 0).length > 5) {
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

    const note = {
      title,
      content,
      createdBy: username,
      createdById: userId,
      tags,
      attachments,
      ratings: [],
      averageRating: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
    };

    const result = await db.collection("Notes").insertOne(note);

    if (!result.insertedId) {
      console.error("Failed to insert note into database:", note);
      return NextResponse.json({ message: "Failed to insert note into database" }, { status: 500 });
    }

    const insertedNote = await db.collection("Notes").findOne({ _id: result.insertedId });
    console.log("Note created successfully:", insertedNote._id);
    return NextResponse.json(insertedNote, { status: 201 });
  } catch (error: any) {
    console.error("Error creating note:", error);
    return NextResponse.json({ message: "Server error while creating note", error: error.message }, { status: 500 });
  }
}