import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);

export async function POST(request: Request) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json({ error: "Token and email are required" }, { status: 400 });
    }

    await client.connect();
    const db = client.db("learning_platform");
    const usersCollection = db.collection("Users");

    const user = await usersCollection.findOne({ email, resetToken: token });

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (user.resetTokenExpiry < Date.now()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    return NextResponse.json({ message: "Token is valid" }, { status: 200 });
  } catch (error: any) {
    console.error("Error in validate-reset-token:", error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  } finally {
    await client.close();
  }
}