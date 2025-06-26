import type { Metadata } from "next";
import "./globals.css";
import Login from "./login/page";
import Signup from "./signup/page";
import { Providers } from "./providers";
import { Toaster } from "sonner";

// app/layout.tsx 
export const metadata: Metadata = {
  title: "ChatApp",
  description: "A modern chat application",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
