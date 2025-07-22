import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);

export async function POST(request: Request) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Token, email, and password are required" }, { status: 400 });
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and clear the reset token
    const updateResult = await usersCollection.updateOne(
      { email, resetToken: token },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  } finally {
    await client.close();
  }
}