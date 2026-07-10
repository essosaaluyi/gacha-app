"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageVideoBackground() {
  const pathname = usePathname();
  const videoLayerRef = useRef<HTMLDivElement | null>(null);
  const lightRef = useRef<HTMLDivElement | null>(null);
  const vignetteRef = useRef<HTMLDivElement | null>(null);
  const isTitlePage = pathname === "/";
  const isBattlePage = pathname === "/battle";
  const shouldShowVideo = !isTitlePage && !isBattlePage;

  useEffect(() => {
    document.body.classList.toggle("page-video-active", shouldShowVideo);

    return () => {
      document.body.classList.remove("page-video-active");
    };
  }, [shouldShowVideo]);

  useEffect(() => {
    if (!shouldShowVideo) return;

    const handleMouseMove = (event: MouseEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const x = Math.min(Math.max(event.clientX / width, 0), 1);
      const y = Math.min(Math.max(event.clientY / height, 0), 1);

      lightRef.current?.style.setProperty("--mouse-x", `${x * 100}%`);
      lightRef.current?.style.setProperty("--mouse-y", `${y * 100}%`);

      const videoShiftX = (0.5 - x) * 120;
      const videoShiftY = (0.5 - y) * 64;
      const overlayShiftX = (0.5 - x) * 28;
      const overlayShiftY = (0.5 - y) * 18;

      if (videoLayerRef.current) {
        videoLayerRef.current.style.transform = `translate3d(${videoShiftX}px, ${videoShiftY}px, 0) scale(0.9)`;
      }

      if (vignetteRef.current) {
        vignetteRef.current.style.transform = `translate3d(${overlayShiftX}px, ${overlayShiftY}px, 0)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [shouldShowVideo]);

  if (!shouldShowVideo) return null;

  return (
    <div
      className="page-video-background"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#020617",
      }}
    >
      <div
        ref={videoLayerRef}
        className="page-video-parallax"
        style={{
          position: "fixed",
          left: "-12vw",
          top: "-12vh",
          width: "124vw",
          height: "124vh",
          transform: "translate3d(0, 0, 0) scale(0.9)",
          transformOrigin: "center center",
          transition: "transform 120ms ease-out",
          willChange: "transform",
        }}
      >
        <video
          className="page-video-media"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            minWidth: "100%",
            minHeight: "100%",
            objectFit: "cover",
            objectPosition: "center center",
          }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          src="/videos/Bgvideolooppages.mp4"
        />
      </div>
      <div
        ref={vignetteRef}
        className="page-video-vignette"
        style={{
          position: "fixed",
          inset: "-4%",
          transform: "translate3d(0, 0, 0)",
          transition: "transform 180ms ease-out",
          background:
            "radial-gradient(circle at 50% 42%, transparent 0 26%, rgba(0, 0, 0, 0.32) 66%, rgba(0, 0, 0, 0.76) 100%)",
          willChange: "transform",
        }}
      />
      <div
        ref={lightRef}
        className="page-video-mouse-light"
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.14), rgba(96, 165, 250, 0.08) 16%, transparent 34%)",
          mixBlendMode: "screen",
          opacity: 0.62,
        }}
      />
      <div
        className="page-video-darken"
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.6)), rgba(2, 6, 23, 0.2)",
        }}
      />
    </div>
  );
}
