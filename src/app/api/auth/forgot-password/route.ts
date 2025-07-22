import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import crypto from "crypto";
import { sendEmail } from "@/lib/sendEmail";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await client.connect();
    const db = client.db("learning_platform");
    const usersCollection = db.collection("Users");

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "No user found with this email" }, { status: 404 });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Store the token in the database
    await usersCollection.updateOne(
      { email },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      }
    );

    // Create the reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send the email
    const emailResult = await sendEmail({
      to: email,
      subject: "Password Reset Request - Smart AI Classroom",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.firstName},</p>
          <p>We received a request to reset your password for your Smart AI Classroom account.</p>
          <p>Please click the link below to reset your password:</p>
          <p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>Best regards,<br/>Smart AI Classroom Team</p>
        </div>
      `,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Password reset email sent successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  } finally {
    await client.close();
  }
}