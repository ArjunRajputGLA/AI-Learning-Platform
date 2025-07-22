import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const noteId = params.id;

  if (!noteId || !ObjectId.isValid(noteId)) {
    return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
  }

  const { comment } = await req.json();
  if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
    return NextResponse.json({ message: "Comment cannot be empty" }, { status: 400 });
  }

  const { db } = await connectToDatabase("learning_platform");
  const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

  if (!note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 });
  }

  const newComment = {
    userId,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
    createdBy: session.user.name || "Anonymous", // Include the commenter's name
  };

  const result = await db.collection("Notes").updateOne(
    { _id: new ObjectId(noteId) },
    {
      $push: { comments: newComment },
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ message: "Failed to add comment" }, { status: 500 });
  }

  const updatedNote = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });
  return NextResponse.json(updatedNote, { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const noteId = params.id;
  const { searchParams } = new URL(req.url);
  const commentIndex = parseInt(searchParams.get("index") || "-1", 10);

  if (!noteId || !ObjectId.isValid(noteId)) {
    return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
  }

  if (isNaN(commentIndex) || commentIndex < 0) {
    return NextResponse.json({ message: "Invalid comment index" }, { status: 400 });
  }

  const { db } = await connectToDatabase("learning_platform");
  const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

  if (!note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 });
  }

  if (!note.comments || commentIndex >= note.comments.length) {
    return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  }

  const comment = note.comments[commentIndex];
  if (comment.userId !== userId) {
    return NextResponse.json({ message: "You are not authorized to delete this comment" }, { status: 403 });
  }

  const result = await db.collection("Notes").updateOne(
    { _id: new ObjectId(noteId) },
    {
      $pull: { comments: { userId, createdAt: comment.createdAt } },
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ message: "Failed to delete comment" }, { status: 500 });
  }

  const updatedNote = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });
  return NextResponse.json(updatedNote, { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const noteId = params.id;
  const { searchParams } = new URL(req.url);
  const commentIndex = parseInt(searchParams.get("index") || "-1", 10);

  if (!noteId || !ObjectId.isValid(noteId)) {
    return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
  }

  if (isNaN(commentIndex) || commentIndex < 0) {
    return NextResponse.json({ message: "Invalid comment index" }, { status: 400 });
  }

  const { comment: newCommentText } = await req.json();
  if (!newCommentText || typeof newCommentText !== "string" || newCommentText.trim().length === 0) {
    return NextResponse.json({ message: "Comment cannot be empty" }, { status: 400 });
  }

  const { db } = await connectToDatabase("learning_platform");
  const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

  if (!note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 });
  }

  if (!note.comments || commentIndex >= note.comments.length) {
    return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  }

  const comment = note.comments[commentIndex];
  if (comment.userId !== userId) {
    return NextResponse.json({ message: "You are not authorized to edit this comment" }, { status: 403 });
  }

  const updatedComment = {
    ...comment,
    comment: newCommentText.trim(),
    updatedAt: new Date().toISOString(),
  };

  const result = await db.collection("Notes").updateOne(
    { _id: new ObjectId(noteId) },
    {
      $set: { [`comments.${commentIndex}`]: updatedComment },
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ message: "Failed to update comment" }, { status: 500 });
  }

  const updatedNote = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });
  return NextResponse.json(updatedNote, { status: 200 });
}