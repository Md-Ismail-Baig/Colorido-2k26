import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cinzel, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "COLORIDO 2K26 — Cultural & Sports Festival | 28 December 2026",
    template: "%s | COLORIDO 2K26",
  },
  description:
    "COLORIDO 2K26 — a college-level Cultural & Sports Festival. Discover events, view schedules, and register online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
