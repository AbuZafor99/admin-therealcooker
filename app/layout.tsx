import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "The Real Cooker Admin",
  description: "Administration dashboard for The Real Cooker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full"><Providers>{children}</Providers></body>
    </html>
  );
}
