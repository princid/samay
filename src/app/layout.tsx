import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samay — AI Video-to-Anime Converter",
  description:
    "Transform your videos into stunning anime-style artwork using AI. Upload an MP4 video and watch the magic happen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#0a0a0f]">
        {children}
      </body>
    </html>
  );
}
