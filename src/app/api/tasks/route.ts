import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const db = await getDb();
  console.log("GET: Fetching tasks for userId:", userId);
  const tasks = await db
    .collection("To-Do-List")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  console.log("GET: Found tasks:", tasks);

  return NextResponse.json(tasks);
}

export async function POST(request) {
  const { userId, title, priority, dueDate } = await request.json();
  console.log("POST: Received data:", { userId, title, priority, dueDate });

  if (!userId || !title) {
    console.log("POST: Validation failed - userId or title missing");
    return NextResponse.json({ error: "User ID and title are required" }, { status: 400 });
  }

  const validPriorities = ["low", "medium", "high"];
  if (priority && !validPriorities.includes(priority)) {
    console.log("POST: Validation failed - invalid priority");
    return NextResponse.json({ error: "Priority must be 'low', 'medium', or 'high'" }, { status: 400 });
  }

  try {
    const db = await getDb();
    console.log("POST: Connected to database:", db.databaseName);
    console.log("POST: Inserting task into To-Do-List collection");
    const result = await db.collection("To-Do-List").insertOne({
      userId,
      title,
      completed: false,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
      completedAt: null,
    });
    console.log("POST: Insert result:", result);

    if (!result.acknowledged) {
      throw new Error("Insert operation was not acknowledged by the database");
    }

    const insertedTask = await db.collection("To-Do-List").findOne({ _id: result.insertedId });
    console.log("POST: Verified inserted task:", insertedTask);

    if (!insertedTask) {
      throw new Error("Task was not found in the database after insertion");
    }

    return NextResponse.json({ _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST: Error inserting task:", error);
    return NextResponse.json({ error: "Failed to insert task", details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const { title, priority, dueDate, completed } = await request.json();
  console.log("PUT: Updating task with ID:", id, "with data:", { title, priority, dueDate, completed });

  if (!title) {
    console.log("PUT: Validation failed - title missing");
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const validPriorities = ["low", "medium", "high"];
  if (priority && !validPriorities.includes(priority)) {
    console.log("PUT: Validation failed - invalid priority");
    return NextResponse.json({ error: "Priority must be 'low', 'medium', or 'high'" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const updateData = {
      title,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      completed: completed || false,
      completedAt: completed ? new Date() : null,
    };

    console.log("PUT: Updating task in To-Do-List collection");
    const result = await db.collection("To-Do-List").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    console.log("PUT: Update result:", result);
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task updated" });
  } catch (error) {
    console.error("PUT: Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const { completed } = await request.json();
  const db = await getDb();
  console.log("PATCH: Updating task with ID:", id, "to completed:", completed);
  const result = await db.collection("To-Do-List").updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        completed,
        completedAt: completed ? new Date() : null,
      },
    },
  );

  console.log("PATCH: Update result:", result);
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Task updated" });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const db = await getDb();
  console.log("DELETE: Deleting task with ID:", id);
  const result = await db.collection("To-Do-List").deleteOne({ _id: new ObjectId(id) });

  console.log("DELETE: Delete result:", result);
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Task deleted" });
}