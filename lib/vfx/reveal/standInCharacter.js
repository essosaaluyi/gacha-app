import { CapsuleGeometry, SphereGeometry, Matrix4 } from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * A crude humanoid built from capsules, merged into one geometry.
 *
 * This exists so the 3D-vs-sprite question can be answered without anyone
 * commissioning a model first. It is deliberately ugly — the point is not how
 * it looks but that it has a *real silhouette*: limbs that particles can pass
 * behind, and a shape an aura hull can hug. Swap it for a real glTF and every
 * effect behaves the same way, only better.
 *
 * One merged geometry rather than a group, because the aura is a second draw of
 * the same geometry inflated along its normals — that trick needs a single
 * buffer to work from.
 *
 * @param {number} height total height in world units
 */
export function createStandInCharacter(height = 2.2) {
  const s = height / 2.2; // proportions below are authored at 2.2 units tall
  const parts = [];

  const push = (geometry, x, y, z, rotZ = 0) => {
    const m = new Matrix4().makeRotationZ(rotZ);
    m.setPosition(x * s, y * s, z * s);
    geometry.applyMatrix4(m);
    parts.push(geometry);
  };

  // Head, torso, arms, legs. Low segment counts on purpose: the aura pass draws
  // this geometry a second time, so every triangle here is paid for twice.
  push(new SphereGeometry(0.19 * s, 16, 12), 0, 1.92, 0);
  push(new CapsuleGeometry(0.055 * s, 0.1 * s, 4, 8), 0, 1.7, 0); // neck
  push(new CapsuleGeometry(0.2 * s, 0.42 * s, 6, 14), 0, 1.34, 0); // chest
  push(new CapsuleGeometry(0.16 * s, 0.2 * s, 6, 12), 0, 0.98, 0); // waist

  push(new CapsuleGeometry(0.07 * s, 0.34 * s, 4, 10), -0.29, 1.36, 0, 0.18);
  push(new CapsuleGeometry(0.06 * s, 0.3 * s, 4, 10), -0.37, 0.96, 0, 0.1);
  push(new CapsuleGeometry(0.07 * s, 0.34 * s, 4, 10), 0.29, 1.36, 0, -0.18);
  push(new CapsuleGeometry(0.06 * s, 0.3 * s, 4, 10), 0.37, 0.96, 0, -0.1);

  push(new CapsuleGeometry(0.09 * s, 0.36 * s, 4, 10), -0.11, 0.62, 0);
  push(new CapsuleGeometry(0.075 * s, 0.34 * s, 4, 10), -0.11, 0.2, 0);
  push(new CapsuleGeometry(0.09 * s, 0.36 * s, 4, 10), 0.11, 0.62, 0);
  push(new CapsuleGeometry(0.075 * s, 0.34 * s, 4, 10), 0.11, 0.2, 0);

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const part of parts) part.dispose();

  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
