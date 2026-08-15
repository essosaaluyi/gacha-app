import { Sprite, Texture } from "pixi.js";

export function createCenteredSprite(texture: Texture) {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}