import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { signIn } from "next-auth/react";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Sign in with NextAuth
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Return success response
    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
