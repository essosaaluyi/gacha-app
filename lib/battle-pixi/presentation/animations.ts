import { Sprite, Container } from "pixi.js";

type TransformTarget = {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  alpha?: number;
};

export const animateTo = (
  sprite: Sprite | Container,
  targetX: number,
  targetY: number,
  duration = 250
) => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startTime = performance.now();

  const animate = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);

    sprite.x = startX + (targetX - startX) * progress;
    sprite.y = startY + (targetY - startY) * progress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

export const fadeAndSlideOut = (
  sprite: Sprite,
  targetX: number,
  targetY: number,
  duration = 350
) => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startAlpha = sprite.alpha;
  const startTime = performance.now();

  const animate = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);

    sprite.x = startX + (targetX - startX) * progress;
    sprite.y = startY + (targetY - startY) * progress;
    sprite.alpha = startAlpha * (1 - progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      sprite.visible = false;
      sprite.alpha = 1;
    }
  };

  requestAnimationFrame(animate);
};

export const animateTransformTo = (
  sprite: Sprite | Container,
  target: TransformTarget,
  duration = 360,
  easing: "out" | "back" = "out"
) => {
  const startX = sprite.x;
  const startY = sprite.y;
  const startRotation = sprite.rotation;
  const startScale = sprite.scale.x;
  const startAlpha = sprite.alpha;
  const targetX = target.x ?? startX;
  const targetY = target.y ?? startY;
  const targetRotation = target.rotation ?? startRotation;
  const targetScale = target.scale ?? startScale;
  const targetAlpha = target.alpha ?? startAlpha;
  const startTime = performance.now();

  const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3);
  const easeOutBack = (progress: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
  };

  const animate = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easing === "back" ? easeOutBack(progress) : easeOut(progress);

    sprite.x = startX + (targetX - startX) * eased;
    sprite.y = startY + (targetY - startY) * eased;
    sprite.rotation =
      startRotation + (targetRotation - startRotation) * eased;
    sprite.scale.set(startScale + (targetScale - startScale) * eased);
    sprite.alpha = startAlpha + (targetAlpha - startAlpha) * eased;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};
