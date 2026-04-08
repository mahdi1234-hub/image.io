import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image.io - AI Vision Agent",
  description: "AI-powered computer vision chat agent with object detection and image classification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased font-sans text-primary selection:bg-neutral-200 selection:text-neutral-900 bg-[#f5f1ea]">
        {children}
      </body>
    </html>
  );
}
