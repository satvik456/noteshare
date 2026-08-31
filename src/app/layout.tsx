import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "NoteShare — Secure Note-Taking & Sharing",
  description:
    "Create private notes and share them via secure, expiring share links with public or password-protected access.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef2f7] text-[#2d3748] selection:bg-blue-500/20 selection:text-blue-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
