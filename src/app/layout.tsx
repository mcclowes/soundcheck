import type { Metadata } from "next";
import { Inter, Pirata_One } from "next/font/google";
import "./globals.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const pirataOne = Pirata_One({
  variable: "--font-pirata",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soundcheck - Music Pop Quiz",
  description: "AI-powered music pop quiz game. Listen to song snippets and guess the title or artist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${pirataOne.variable}`}>{children}</body>
    </html>
  );
}
