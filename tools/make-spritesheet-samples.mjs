// Builds WebP sprite-sheet (Pixi texture atlas) samples for lag proposals 1 and 7.
//   node tools/make-spritesheet-samples.mjs            # all sequences
//   node tools/make-spritesheet-samples.mjs enemy-one  # one sequence
//
// Reads production PNG sequences only. Output: outputs/compression-samples/sheets/<name>/
//   sheet-00.webp …   lossy WebP q85 with alpha (the sample)
//   sheet-00.json …   TexturePacker-style JSON hash, one per sheet (Pixi Spritesheet format,
//                     linked with meta.related_multi_packs)
//   ref-00.png …      lossless reference sheets with the identical layout (for SSIM only)
//   manifest.json     frame order, fps, crop, sheet list and measured numbers
// Nothing under public/ is modified.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ffbin = process.env.FFMPEG_BIN ||
  path.join(process.env.LOCALAPPDATA, "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin");
const FF = path.join(ffbin, "ffmpeg");
const OUT = path.join(root, "outputs/compression-samples/sheets");
const MAX_SHEET = 4096;   // safe texture size on phones as well as desktop GPUs
const QUALITY = 85;

const enemy = (name) => ({
  name: `enemy-${name}`, dir: `public/images/battle-characters/enemy-${name}/idle`,
  pattern: "%04d.png", fileRe: /^\d{4}\.png$/, fps: 25, crop: true,
});
const SEQUENCES = [
  ...["one", "two", "four", "six", "seven"].map(enemy),
  { name: "chance-UR3", dir: "public/videos/chance-reveal/UR3", pattern: "crv-bg-ur3%03d.png",
    fileRe: /^crv-bg-ur3\d{3}\.png$/, fps: 30, crop: false, alphaCheck: true },
];

function ff(args, { capture = false } = {}) {
  const r = spawnSync(FF, ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}\n${r.stderr.slice(-2000)}`);
  return capture ? r.stderr : "";
}
const bytes = (files) => files.reduce((s, f) => s + fs.statSync(f).size, 0);
const ssim = (stderr) => Number((stderr.match(/All:([0-9.]+)/g) || []).pop()?.slice(4));

function build(seq) {
  const src = path.join(root, seq.dir);
  const frames = fs.readdirSync(src).filter((f) => seq.fileRe.test(f)).sort();
  // Frame number = the last N digits before ".png", N from the %0Nd pattern
  // ("crv-bg-ur3000.png" is frame 0, not 3000).
  const width = Number(seq.pattern.match(/%0(\d)d/)[1]);
  const first = Number(frames[0].slice(-4 - width, -4));
  const input = ["-framerate", String(seq.fps), "-start_number", String(first), "-i", path.join(src, seq.pattern)];
  const probe = ff(["-v", "info", "-i", path.join(src, frames[0]), "-f", "null", "-"], { capture: true });
  const [, W, H] = probe.match(/, (\d+)x(\d+)/).map(Number);

  // Union of the visible (alpha > 0) area over every frame; keeps frames aligned.
  let crop = { w: W, h: H, x: 0, y: 0 };
  if (seq.crop) {
    const log = ff(["-v", "info", ...input, "-vf", "alphaextract,cropdetect=limit=0:round=2:reset=0", "-f", "null", "-"], { capture: true });
    const m = [...log.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    if (m) crop = { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
  }
  // Fewest sheets that fit, then the smallest grid that spreads the frames evenly
  // over them (so the last sheet is not a full-size texture holding one frame).
  const maxCols = Math.max(1, Math.floor(MAX_SHEET / crop.w));
  const maxRows = Math.max(1, Math.floor(MAX_SHEET / crop.h));
  const sheets = Math.ceil(frames.length / (maxCols * maxRows));
  const target = Math.ceil(frames.length / sheets);
  let cols = maxCols, rows = maxRows;
  for (let c = 1; c <= maxCols; c++) {
    const r = Math.ceil(target / c);
    if (r <= maxRows && c * r * crop.w * crop.h < cols * rows * crop.w * crop.h) { cols = c; rows = r; }
  }
  const perSheet = cols * rows;

  const dir = path.join(OUT, seq.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const vf = `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},format=rgba,tile=${cols}x${rows}:color=0x00000000`;
  ff(["-v", "error", ...input, "-vf", vf, "-c:v", "libwebp", "-quality", String(QUALITY), "-pix_fmt", "yuva420p",
    "-start_number", "0", path.join(dir, "sheet-%02d.webp")]);
  ff(["-v", "error", ...input, "-vf", vf, "-start_number", "0", path.join(dir, "ref-%02d.png")]);

  const sheetFiles = fs.readdirSync(dir).filter((f) => /^sheet-\d\d\.webp$/.test(f)).sort();
  if (sheetFiles.length !== sheets) throw new Error(`${seq.name}: expected ${sheets} sheets, got ${sheetFiles.length}`);

  // Pixi / TexturePacker JSON hash per sheet.
  const frameName = (i) => `${seq.name}-${String(i).padStart(4, "0")}`;
  sheetFiles.forEach((file, s) => {
    const json = { frames: {}, meta: {
      app: "tools/make-spritesheet-samples.mjs", image: file, format: "RGBA8888", scale: "1",
      size: { w: cols * crop.w, h: rows * crop.h },
      related_multi_packs: sheetFiles.filter((_, o) => o !== s).map((f) => f.replace(".webp", ".json")),
    } };
    for (let k = 0; k < perSheet; k++) {
      const i = s * perSheet + k;
      if (i >= frames.length) break;
      json.frames[frameName(i)] = {
        frame: { x: (k % cols) * crop.w, y: Math.floor(k / cols) * crop.h, w: crop.w, h: crop.h },
        rotated: false, trimmed: seq.crop,
        spriteSourceSize: { x: crop.x, y: crop.y, w: crop.w, h: crop.h },
        sourceSize: { w: W, h: H },
      };
    }
    if (s === 0) json.animations = { [seq.name]: frames.map((_, i) => frameName(i)) };
    fs.writeFileSync(path.join(dir, file.replace(".webp", ".json")), JSON.stringify(json));
  });

  // Quality: premultiplied colour SSIM, plus the alpha plane on its own.
  const pair = ["-i", path.join(dir, "ref-%02d.png"), "-i", path.join(dir, "sheet-%02d.webp")];
  const colour = ssim(ff(["-v", "info", ...pair, "-filter_complex",
    "[0]format=rgba,premultiply=inplace=1,format=yuv420p[a];[1]format=rgba,premultiply=inplace=1,format=yuv420p[b];[a][b]ssim",
    "-f", "null", "-"], { capture: true }));
  const alpha = ssim(ff(["-v", "info", ...pair, "-filter_complex", "[0]format=rgba,alphaextract[a];[1]format=rgba,alphaextract[b];[a][b]ssim",
    "-f", "null", "-"], { capture: true }));
  // Largest per-pixel alpha error anywhere (0 = semi-transparent fades reproduced exactly).
  const diff = ff(["-v", "info", ...pair, "-filter_complex",
    "[0]format=rgba,alphaextract[a];[1]format=rgba,alphaextract[b];[a][b]blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YMAX",
    "-f", "null", "-"], { capture: true });
  const alphaMaxError = Math.max(...[...diff.matchAll(/YMAX=(\d+)/g)].map((m) => +m[1]));

  const sheetPaths = sheetFiles.map((f) => path.join(dir, f));
  const result = {
    name: seq.name, source: seq.dir, framePattern: seq.pattern, firstFrame: first, frames: frames.length, fps: seq.fps,
    sourceSize: { w: W, h: H }, crop, grid: { cols, rows, perSheet }, sheets: sheetFiles,
    sheetSize: { w: cols * crop.w, h: rows * crop.h },
    originalBytes: bytes(frames.map((f) => path.join(src, f))),
    sheetBytes: bytes(sheetPaths),
    jsonBytes: bytes(sheetFiles.map((f) => path.join(dir, f.replace(".webp", ".json")))),
    ssimColour: colour, ssimAlpha: alpha, alphaMaxError,
    // Decoded texture memory (RGBA8): what the GPU holds once every frame/sheet is uploaded.
    decodedMBOriginal: +((W * H * 4 * frames.length) / 1048576).toFixed(1),
    decodedMBSheets: +((cols * crop.w * rows * crop.h * 4 * sheets) / 1048576).toFixed(1),
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(result, null, 2));
  return result;
}

const only = process.argv[2];
const rows = [];
for (const seq of SEQUENCES.filter((s) => !only || s.name === only)) {
  const r = build(seq);
  rows.push(r);
  console.log([r.name, `${r.frames}f`, `crop ${r.crop.w}x${r.crop.h}`, `${r.sheets.length} sheets ${r.sheetSize.w}x${r.sheetSize.h}`,
    `${(r.originalBytes / 1048576).toFixed(1)}MB -> ${(r.sheetBytes / 1048576).toFixed(1)}MB`,
    `ssim ${r.ssimColour} alpha ${r.ssimAlpha} alphaMaxErr ${r.alphaMaxError}`,
    `gpu ${r.decodedMBOriginal}MB -> ${r.decodedMBSheets}MB`].join(" | "));
}
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
