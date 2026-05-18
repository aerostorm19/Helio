import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helio — AI Voice Receptionist",
  description: "Every call answered. Every customer heard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
