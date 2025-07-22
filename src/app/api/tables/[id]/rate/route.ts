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

  const { rating } = await req.json();
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ message: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const { db } = await connectToDatabase("learning_platform");
  const note = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });

  if (!note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 });
  }

  // Check if user has already rated this note
  const existingRatingIndex = note.ratings.findIndex((r: { userId: string }) => r.userId === userId);
  const updatedRatings = [...note.ratings];

  if (existingRatingIndex !== -1) {
    // Update existing rating
    updatedRatings[existingRatingIndex] = { userId, rating, createdAt: new Date().toISOString() };
  } else {
    // Add new rating
    updatedRatings.push({ userId, rating, createdAt: new Date().toISOString() });
  }

  // Calculate new average rating
  const averageRating =
    updatedRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / updatedRatings.length;

  const result = await db.collection("Notes").updateOne(
    { _id: new ObjectId(noteId) },
    {
      $set: {
        ratings: updatedRatings,
        averageRating,
      },
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ message: "Failed to update rating" }, { status: 500 });
  }

  const updatedNote = await db.collection("Notes").findOne({ _id: new ObjectId(noteId) });
  return NextResponse.json(updatedNote, { status: 200 });
}