import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { signIn } from "next-auth/react";
<<<<<<< HEAD

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Validate input
=======
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
>>>>>>> f081092 (done all except ui and users page)
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
<<<<<<< HEAD

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Check if user exists
=======
    const user = await prisma.user.findUnique({
      where: { username },
    });
>>>>>>> f081092 (done all except ui and users page)
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
<<<<<<< HEAD

    // Verify password
=======
>>>>>>> f081092 (done all except ui and users page)
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
<<<<<<< HEAD

    // Sign in with NextAuth
=======
>>>>>>> f081092 (done all except ui and users page)
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
<<<<<<< HEAD

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Return success response
=======
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
>>>>>>> f081092 (done all except ui and users page)
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
