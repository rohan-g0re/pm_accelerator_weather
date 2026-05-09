import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather App",
  description: "AI Engineer Intern Technical Assessment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen relative font-sans text-white overflow-hidden selection:bg-[#D4FF00] selection:text-black">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-[#112240] to-slate-800 z-0 transition-colors duration-1000" id="dynamic-bg" />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}