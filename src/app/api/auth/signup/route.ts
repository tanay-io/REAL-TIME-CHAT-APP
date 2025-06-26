import { NextResponse } from "next/server";
<<<<<<< HEAD
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

=======
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
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

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

=======
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
>>>>>>> f081092 (done all except ui and users page)
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }
<<<<<<< HEAD

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Create the user
=======
    const hashedPassword = await hash(password, 12);
>>>>>>> f081092 (done all except ui and users page)
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
<<<<<<< HEAD
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
=======
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });
    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
>>>>>>> f081092 (done all except ui and users page)
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
