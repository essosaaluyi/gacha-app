import type { Metadata } from "next";
import "./globals.css";
import BGMPlayer from "@/components/BGMPlayer";
import PageVideoBackground from "@/components/PageVideoBackground";

export const metadata: Metadata = {
  title: "Gacha Battle",
  description: "Card-style gacha slot battle game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PageVideoBackground />
        <div
          className="app-content-with-video"
          style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}
        >
          {children}
        </div>
        <div className="global-bgm-player">
          <BGMPlayer />
        </div>
      </body>
    </html>
  );
}
