"use client";
<<<<<<< HEAD

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
=======
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
        {children}
    </SessionProvider>
  );
>>>>>>> f081092 (done all except ui and users page)
}
