import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
    };
  }
}
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
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
<<<<<<< HEAD
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
=======
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Please provide both username and password");
          }
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });
          if (!user) {
            throw new Error("Invalid username or password");
          }
>>>>>>> f081092 (done all except ui and users page)
          const isValidPassword = await compare(
            credentials.password,
            user.password
          );
          if (!isValidPassword) {
            throw new Error("Invalid username or password");
          }
<<<<<<< HEAD

          // 5. Return user object
=======
>>>>>>> f081092 (done all except ui and users page)
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
<<<<<<< HEAD
 
      async redirect({ baseUrl }) {
        return `${baseUrl}/chat`;
      },
    
    
=======
      async redirect({ baseUrl }) {
        return `${baseUrl}/chat`;
      },
>>>>>>> f081092 (done all except ui and users page)
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
<<<<<<< HEAD
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

=======
    maxAge: 30 * 24 * 60 * 60,
  },
};
>>>>>>> f081092 (done all except ui and users page)
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
