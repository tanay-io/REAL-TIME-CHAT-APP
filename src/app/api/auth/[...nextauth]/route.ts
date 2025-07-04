import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
    };
  }
}
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 1. Validate credentials
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Please provide both username and password");
          }

          // 2. Find user
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          // 3. If user doesn't exist, throw error
          if (!user) {
            throw new Error("Invalid username or password");
          }

          // 4. Verify password
          const isValidPassword = await compare(
            credentials.password,
            user.password
          );
          if (!isValidPassword) {
            throw new Error("Invalid username or password");
          }

          // 5. Return user object
          return {
            id: user.id,
            name: user.username,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/chat`;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
