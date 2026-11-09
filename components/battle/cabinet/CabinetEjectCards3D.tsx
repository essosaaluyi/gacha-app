"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CabinetEject3DGeometry, CabinetEjectStageQuad } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";
import styles from "./CabinetEjectCards3D.module.css";

export { CABINET_EJECT3D_DURATION_MS, getCabinetEject3DLandingQuads } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";
export type { CabinetEject3DGeometry, CabinetEjectStageQuad } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";
export type CabinetEjectCards3DHandle = { seek(elapsedMs: number): void };
export type CabinetEjectCards3DProps = {
  active: boolean;
  geometry: CabinetEject3DGeometry;
  frontImages: readonly [string, string, string];
  onReady?: (landingQuads: readonly [CabinetEjectStageQuad, CabinetEjectStageQuad, CabinetEjectStageQuad]) => void;
  onError?: () => void;
  className?: string;
};

const CabinetEjectCards3D = forwardRef<CabinetEjectCards3DHandle, CabinetEjectCards3DProps>(function CabinetEjectCards3D({ active, geometry, frontImages, onReady, onError, className }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ seek(time: number): void; dispose(): void } | null>(null);
  const elapsed = useRef(-1);
  const latest = useRef({ geometry, frontImages, onReady, onError });
  const textureKey = frontImages.join("\u0000");
  useEffect(() => { latest.current = { geometry, frontImages, onReady, onError }; }, [geometry, frontImages, onReady, onError]);
  useImperativeHandle(ref, () => ({ seek(time) { elapsed.current = time; scene.current?.seek(time); } }), []);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void import("@/lib/battle-pixi/presentation/cabinetEject3DRenderer").then(({ mountCabinetEject3D }) => {
      if (cancelled || !host.current) return;
      scene.current = mountCabinetEject3D(host.current, latest.current.geometry, latest.current.frontImages,
        quads => { if (!cancelled) latest.current.onReady?.(quads); }, () => { if (!cancelled) latest.current.onError?.(); });
      scene.current.seek(elapsed.current);
    }).catch(() => { if (!cancelled) latest.current.onError?.(); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; elapsed.current = -1; };
  }, [active, geometry, textureKey]);
  return <div ref={host} className={`${styles.layer}${className ? ` ${className}` : ""}`} aria-hidden="true" data-eject3d-active={active} />;
});
export default CabinetEjectCards3D;
