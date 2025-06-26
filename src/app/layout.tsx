import type { Metadata } from "next";
import "./globals.css";
import Login from "./login/page";
import Signup from "./signup/page";
import { Providers } from "./providers";
import { Toaster } from "sonner";
<<<<<<< HEAD

// app/layout.tsx 
=======
>>>>>>> f081092 (done all except ui and users page)
export const metadata: Metadata = {
  title: "ChatApp",
  description: "A modern chat application",
};
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
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
