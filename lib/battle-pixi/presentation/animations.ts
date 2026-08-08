import { Sprite, Container } from "pixi.js";

type TransformTarget = {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  alpha?: number;
};

/**
 * A guard returns `false` once the hand that started an animation has been
 * superseded (a new draw bumped the hand generation) or the stage was torn
 * down. When it returns false the tween stops on the next frame and applies
 * no further writes to the sprite, so callbacks from an old hand can never
 * corrupt a newer hand's cards. Defaults to "always alive" so existing
 * callers keep working unchanged.
 */
export type AnimationGuard = () => boolean;

/** Cancels an in-flight tween. Safe to call multiple times. */
export type CancelAnimation = () => void;

const alwaysAlive: AnimationGuard = () => true;

export const animateTo = (
  sprite: Sprite | Container,
  targetX: number,
  targetY: number,
  duration = 250,
  guard: AnimationGuard = alwaysAlive
): CancelAnimation => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startTime = performance.now();
  let rafId = 0;
  let stopped = false;

  const animate = (now: number) => {
    if (stopped || !guard()) return;

    const progress = Math.min((now - startTime) / duration, 1);

    sprite.x = startX + (targetX - startX) * progress;
    sprite.y = startY + (targetY - startY) * progress;

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    }
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
};

export const fadeAndSlideOut = (
  sprite: Sprite | Container,
  targetX: number,
  targetY: number,
  duration = 350,
  guard: AnimationGuard = alwaysAlive
): CancelAnimation => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startAlpha = sprite.alpha;
  const startTime = performance.now();
  let rafId = 0;
  let stopped = false;

  const animate = (now: number) => {
    if (stopped || !guard()) return;

    const progress = Math.min((now - startTime) / duration, 1);

    sprite.x = startX + (targetX - startX) * progress;
    sprite.y = startY + (targetY - startY) * progress;
    sprite.alpha = startAlpha * (1 - progress);

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      sprite.visible = false;
      sprite.alpha = 1;
    }
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
};

export const animateTransformTo = (
  sprite: Sprite | Container,
  target: TransformTarget,
  duration = 360,
  easing: "out" | "back" = "out",
  guard: AnimationGuard = alwaysAlive
): CancelAnimation => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startRotation = sprite.rotation;
  const startScale = sprite.scale.x;
  const startAlpha = sprite.alpha;
  // Only animate the properties the caller actually asked for. Leaving the
  // others untouched (instead of pinning them to their start value) lets an
  // independent tween -- e.g. a fade -- run on the same sprite without the two
  // fighting over the properties they don't share.
  const hasX = target.x !== undefined;
  const hasY = target.y !== undefined;
  const hasRotation = target.rotation !== undefined;
  const hasScale = target.scale !== undefined;
  const hasAlpha = target.alpha !== undefined;
  const targetX = target.x ?? startX;
  const targetY = target.y ?? startY;
  const targetRotation = target.rotation ?? startRotation;
  const targetScale = target.scale ?? startScale;
  const targetAlpha = target.alpha ?? startAlpha;
  const startTime = performance.now();
  let rafId = 0;
  let stopped = false;

  const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3);
  const easeOutBack = (progress: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
  };

  const animate = (now: number) => {
    if (stopped || !guard()) return;

    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easing === "back" ? easeOutBack(progress) : easeOut(progress);

    if (hasX) sprite.x = startX + (targetX - startX) * eased;
    if (hasY) sprite.y = startY + (targetY - startY) * eased;
    if (hasRotation)
      sprite.rotation = startRotation + (targetRotation - startRotation) * eased;
    if (hasScale) sprite.scale.set(startScale + (targetScale - startScale) * eased);
    if (hasAlpha) sprite.alpha = startAlpha + (targetAlpha - startAlpha) * eased;

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    }
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
};
