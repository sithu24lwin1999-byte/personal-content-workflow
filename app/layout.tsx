import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Workflow MVP",
  description: "Supabase and Gemini-powered content workflow."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
