/**
 * Makes the painted card table usable as a texture.
 *
 * The table geometry in lib/table-3d/cabinetTable3D.ts was fitted to the baked
 * art by unprojecting measured art pixels through the solved camera, so running
 * that camera forwards tells any vertex which pixel of the painting it came
 * from. Used as UVs, that pins the painting to the geometry with no resampling
 * at all — the table is drawn from the same pixels it always was, except now
 * they are on something that can turn.
 *
 * Two things have to change about the file before it can be a texture:
 *
 *  - its cut-out edge has to be flooded outwards, or a sample taken at the
 *    silhouette mixes in transparent black and darkens the rim;
 *  - its alpha has to go, because the table's canvas composites over the page
 *    and any alpha the texture carried would punch a hole through the table.
 *
 * It also writes a flat, top-down reconstruction of the table surface. Nothing
 * loads that one: it is the reference to paint the replacement textures over,
 * for the surfaces the painting cannot see (see
 * docs/cabinet-table-3d-texture-assets.md).
 *
 *   node tools/make-table3d-textures.mjs
 *
 * Needs ffmpeg on PATH, to decode the source WebP and encode the results.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC =
  "public/images/cabinet/production/card-table-premium-three-bay-center-only-1120x420.webp";
const OUT_DIR = "public/images/cabinet/table3d";
/** The painting, flooded and opaque. This is the one the table loads. */
const OUT_PAINT = join(OUT_DIR, "table-paint.v1.webp");
/** A flat top-down reconstruction, for Codex to paint over. Not loaded. */
const OUT_TOP = join(OUT_DIR, "table-top-reference.v1.webp");

/** The solved cabinet camera. Must stay in step with cabinetTable3D.ts. */
const CAM = { y: 1.8549, z: 2.3988, pitchDeg: 48.849, fovDeg: 22.3608 };
/** The reference frame the camera was solved in: .bcab-card-table's own box. */
const REF = { w: 1120, h: 350 };
/** The source art's real size. It is drawn at 420 tall and clipped at 350. */
const ART = { w: 1120, h: 420 };

/**
 * The world rectangle the top texture covers, and its density.
 *
 * The table's outline spans x -1.3512..1.3512 and z 0.1119..1.0485. The margin
 * keeps the outermost brass vertices off the texture's edge, where bilinear
 * filtering would start mixing in whatever lies outside.
 */
export const TOP_RECT = { x0: -1.3712, x1: 1.3712, z0: 0.0919, z1: 1.0685 };
const PX_PER_WORLD = 512;

const d2r = (deg) => (deg * Math.PI) / 180;

/** A world point on a horizontal plane, into art pixels. */
function project(x, y, z) {
  const pitch = d2r(CAM.pitchDeg);
  const t = Math.tan(d2r(CAM.fovDeg) / 2);
  const aspect = REF.w / REF.h;
  const dy = y - CAM.y;
  const dz = z - CAM.z;
  const yc = Math.cos(pitch) * dy - Math.sin(pitch) * dz;
  const zc = Math.sin(pitch) * dy + Math.cos(pitch) * dz;
  const ndcX = x / -zc / (t * aspect);
  const ndcY = yc / -zc / t;
  return [((ndcX + 1) / 2) * REF.w, ((1 - ndcY) / 2) * REF.h];
}

function decodeArt() {
  const raw = join(tmpdir(), `table3d-art-${process.pid}.rgba`);
  execFileSync(
    "ffmpeg",
    ["-v", "error", "-y", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgba", raw],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  const buf = readFileSync(raw);
  rmSync(raw, { force: true });
  if (buf.length !== ART.w * ART.h * 4) {
    throw new Error(`art is ${buf.length} bytes, expected ${ART.w * ART.h * 4}`);
  }
  return buf;
}

/**
 * Grows the opaque colour outwards over the transparent pixels.
 *
 * The table is cut out of its background, so a sample taken right at the
 * silhouette lands half on transparent black and darkens the rim. Flooding the
 * colour outwards a few pixels first gives those samples something real to
 * read, and the geometry's own edge still decides where the table stops.
 */
function dilate(src, passes = 6) {
  const { w, h } = ART;
  let cur = Buffer.from(src);
  for (let pass = 0; pass < passes; pass += 1) {
    const next = Buffer.from(cur);
    let grown = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (cur[i + 3] >= 128) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const sx = x + dx;
            const sy = y + dy;
            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
            const j = (sy * w + sx) * 4;
            if (cur[j + 3] < 128) continue;
            r += cur[j];
            g += cur[j + 1];
            b += cur[j + 2];
            n += 1;
          }
        }
        if (!n) continue;
        next[i] = Math.round(r / n);
        next[i + 1] = Math.round(g / n);
        next[i + 2] = Math.round(b / n);
        next[i + 3] = 255;
        grown += 1;
      }
    }
    cur = next;
    if (!grown) break;
  }
  return cur;
}

function sampler(art) {
  const { w, h } = ART;
  return (px, py) => {
    const x = Math.min(w - 1.001, Math.max(0, px - 0.5));
    const y = Math.min(h - 1.001, Math.max(0, py - 0.5));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      const i = (y0 * w + x0) * 4 + c;
      const a = art[i] * (1 - fx) + art[i + 4] * fx;
      const j = i + w * 4;
      const b = art[j] * (1 - fx) + art[j + 4] * fx;
      out[c] = a * (1 - fy) + b * fy;
    }
    return out;
  };
}

function buildTop(art) {
  const sample = sampler(art);
  const w = Math.round((TOP_RECT.x1 - TOP_RECT.x0) * PX_PER_WORLD);
  const h = Math.round((TOP_RECT.z1 - TOP_RECT.z0) * PX_PER_WORLD);
  const out = Buffer.alloc(w * h * 3);
  for (let py = 0; py < h; py += 1) {
    const z = TOP_RECT.z0 + ((py + 0.5) / h) * (TOP_RECT.z1 - TOP_RECT.z0);
    for (let px = 0; px < w; px += 1) {
      const x = TOP_RECT.x0 + ((px + 0.5) / w) * (TOP_RECT.x1 - TOP_RECT.x0);
      const [ax, ay] = project(x, 0, z);
      const [r, g, b] = sample(ax, ay);
      const i = (py * w + px) * 3;
      out[i] = Math.round(r);
      out[i + 1] = Math.round(g);
      out[i + 2] = Math.round(b);
    }
  }
  return { w, h, out };
}

function encode(name, w, h, rgb) {
  const raw = join(tmpdir(), `table3d-out-${process.pid}.rgb`);
  writeFileSync(raw, rgb);
  mkdirSync(OUT_DIR, { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-v", "error", "-y",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${w}x${h}`, "-i", raw,
      "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6",
      name,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  rmSync(raw, { force: true });
}

const art = dilate(decodeArt());

// The painting itself, alpha dropped.
const flat = Buffer.alloc(ART.w * ART.h * 3);
for (let i = 0, j = 0; i < flat.length; i += 3, j += 4) {
  flat[i] = art[j];
  flat[i + 1] = art[j + 1];
  flat[i + 2] = art[j + 2];
}
encode(OUT_PAINT, ART.w, ART.h, flat);
console.log(`${OUT_PAINT}  ${ART.w}x${ART.h}  flooded, opaque`);

const top = buildTop(art);
encode(OUT_TOP, top.w, top.h, top.out);
console.log(
  `${OUT_TOP}  ${top.w}x${top.h}  world x ${TOP_RECT.x0}..${TOP_RECT.x1} z ${TOP_RECT.z0}..${TOP_RECT.z1}`,
);
