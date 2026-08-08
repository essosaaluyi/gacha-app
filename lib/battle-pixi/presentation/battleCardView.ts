import type { Container, Texture } from "pixi.js";

/**
 * Shared surface used by both regular card sprites and perspective card
 * meshes. Everything in the battle flow only needs Container transforms plus
 * a swappable texture.
 */
export type BattleCardView = Container & {
  texture: Texture;
};
