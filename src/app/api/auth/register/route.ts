import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db("learning_platform");
    const usersCollection = db.collection("Users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user based on your schema
    const newUser = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "student",
      profilePicture: "https://example.com/profile/default.jpg", // Default placeholder
      createdAt: new Date(),
      lastActive: new Date(),
      points: 0,
      badges: [],
      learningStats: {
        averageSessionTime: 0,
        totalActiveDays: 0,
        streakDays: 0,
        subjectProgress: {
          Math: 0,
          Science: 0,
        },
      },
      preferences: {
        notifications: true,
        theme: "dark",
        language: "en",
      },
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json(
      { message: "User registered successfully", userId: result.insertedId },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}