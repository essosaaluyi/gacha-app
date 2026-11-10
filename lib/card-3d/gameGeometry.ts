import type { CabinetEject3DGeometry } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";

/** Battle cabinet geometry in 1920×1080 cabinet space, measured on 2026-11-10 from the live
 * /battle page exactly the way BattlePixiStage does it (CABINET_TABLE_SLOT_QUADS projected through
 * the table canvas rect; mouth as passed to the eject renderer). The lab uses this fixed copy;
 * the production integration must pass the live-measured geometry instead. */
export const MEASURED_CABINET_GEOMETRY: CabinetEject3DGeometry = {
  mouth: { x: 168, y: 710, width: 168, height: 120 },
  bays: [
    [650, 787.4, 799.3, 787.4, 773.9, 986.6, 618.1, 986.6],
    [884.6, 787.4, 1033, 787.4, 1047.7, 986.6, 871.4, 986.6],
    [1120.7, 787.4, 1269.1, 787.4, 1298.7, 986.6, 1142.9, 986.6],
  ],
};
