import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw new Error("Failed to connect to the database");
  }
}

export async function POST(req: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const body = await req.json();
    const { email, action, task } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    client = await connectToDatabase();
    const db = client.db("learning_platform");
    const usersCollection = db.collection("Users");
    const tasksCollection = db.collection("To-Do-List");

    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();

    switch (action) {
      case 'getTasks': {
        const tasks = await tasksCollection.find({
          $or: [
            { userId: userId },
            { userId: user._id }
          ]
        }).toArray();

        const formattedTasks = tasks.map(task => ({
          _id: task._id.toString(),
          title: task.title,
          completed: task.completed || false,
          priority: task.priority || 'medium',
          dueDate: task.dueDate,
          createdAt: task.createdAt?.$date || task.createdAt?.toISOString(),
          completedAt: task.completedAt?.$date || task.completedAt?.toISOString()
        }));

        return NextResponse.json({ success: true, tasks: formattedTasks }, { status: 200 });
      }

      case 'createTask': {
        if (!task?.title || !task?.dueDate) {
          return NextResponse.json({ error: "Title and due date are required" }, { status: 400 });
        }

        const newTask = {
          userId,
          title: task.title,
          completed: task.completed || false,
          priority: task.priority || 'medium',
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          createdAt: new Date(),
          completedAt: task.completed ? new Date() : null
        };

        const result = await tasksCollection.insertOne(newTask);
        return NextResponse.json({
          success: true,
          task: { ...newTask, _id: result.insertedId.toString() }
        }, { status: 201 });
      }

      case 'updateTask': {
        if (!task?._id) {
          return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
        }

        const updateData: any = {
          title: task.title,
          completed: task.completed,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
        };

        if (task.completed) {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }

        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(task._id), userId },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
      }

      case 'deleteTask': {
        if (!task?._id) {
          return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
        }

        const result = await tasksCollection.deleteOne({
          _id: new ObjectId(task._id),
          userId
        });

        if (result.deletedCount === 0) {
          return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error(`Error processing ${body?.action}:`, error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}