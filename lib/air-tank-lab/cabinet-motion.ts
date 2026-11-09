import { advanceMotion, type Motion, type MotionDrive } from "@/lib/air-tank-lab/motion";

// Decorative Draw acceleration only. No change to lottery results or lab presets.
export const CABINET_MIX_DRIVE: MotionDrive = { step: 1 / 240, vortex: 4.6, tumble: 3.6, response: 10.5, maxSpeed: 5.2 };
export function advanceCabinetMotion(motion: Motion, elapsed: number, mixing: boolean) {
  advanceMotion(motion, elapsed, "normal", mixing ? 1 : 0.32, mixing ? CABINET_MIX_DRIVE : undefined);
}
