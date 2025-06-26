<<<<<<< HEAD
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

=======
import { PrismaClient } from "@prisma/client";
let prisma: PrismaClient;
>>>>>>> f081092 (done all except ui and users page)
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
export default prisma;
