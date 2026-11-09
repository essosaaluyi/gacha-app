"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PageVideoBackground from "@/components/PageVideoBackground";

// Public website surfaces only. Battle and specialist workstations retain their own presentation.
const websiteRoutes = new Set(["/", "/menu", "/gacha", "/inventory", "/history", "/shop", "/login", "/how-to-play", "/rules", "/support", "/terms", "/privacy", "/cookies", "/cookie-settings", "/battle-order", "/battle-result", "/admin"]);

export default function SiteTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const themed = websiteRoutes.has(pathname);
  return <>
    {!themed && <PageVideoBackground />}
    <div className={`app-content-with-video${themed ? " site-theme" : ""}`} data-site-page={themed ? pathname : undefined} style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>{children}</div>
  </>;
}
