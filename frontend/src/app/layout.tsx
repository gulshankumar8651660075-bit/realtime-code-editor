import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Synapse IDE | Real-Time Collaborative Code Editor & Sandbox",
  description: "Code in real-time with teammates, execute scripts in secure sandboxes, and collaborate with live cursors, syntax highlighting, and inline chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="bg-bg-dark text-text-primary min-h-full flex flex-col">{children}</body>
    </html>
  );
}
