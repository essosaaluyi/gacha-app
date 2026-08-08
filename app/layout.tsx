import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./struggle-overrides.css";
import BGMPlayer from "@/components/BGMPlayer";
import PageVideoBackground from "@/components/PageVideoBackground";

export const metadata: Metadata = {
  title: {
    default: "Destiny Wars — Make the Decisive Draw!",
    template: "%s | Destiny Wars",
  },
  description:
    "Destiny Wars is a free-to-play gacha card battle game. Pull your deck, then win the battle on a single decisive draw.",
  applicationName: "Destiny Wars",
  openGraph: {
    title: "Destiny Wars — Make the Decisive Draw!",
    description:
      "Free-to-play gacha card battle game. Pull your deck, then win on a single decisive draw.",
    siteName: "Destiny Wars",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny Wars — Make the Decisive Draw!",
    description:
      "Free-to-play gacha card battle game. Pull your deck, then win on a single decisive draw.",
  },
};

// The battle screen is a fixed-viewport cabinet; letting the page zoom on
// mobile lets players strand themselves mid-battle with the controls offscreen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
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
        <Analytics />
      </body>
    </html>
  );
}
