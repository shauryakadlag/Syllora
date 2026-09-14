import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Syllora — University Syllabus to Learning Resources",
  description:
    "Syllora is designed to map university syllabus topics to useful learning resources topic-by-topic. Initial MVP target: Savitribai Phule Pune University (SPPU) 2024 Pattern Computer Engineering (SE).",
  keywords: [
    "Syllora",
    "SPPU",
    "Pune University",
    "2024 Pattern",
    "Computer Engineering",
    "Syllabus",
    "Learning Resources",
    "Engineering notes",
    "Engineering videos",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans antialiased bg-background text-foreground selection:bg-primary/10 selection:text-primary">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}