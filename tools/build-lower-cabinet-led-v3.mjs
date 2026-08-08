import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const tableSource = path.join(
  root,
  "public/images/cabinet/production/card-table-premium-three-bay.webp",
);
const ledOnSource = path.join(
  root,
  "public/images/battle-ui/lower-cabinet-led-v2/lower-cabinet-led-on-v2.png",
);
const ledOffSource = path.join(
  root,
  "public/images/battle-ui/lower-cabinet-led-v2/lower-cabinet-led-off-v2.png",
);
const outDir = path.join(
  root,
  "public/images/battle-ui/lower-cabinet-led-v3",
);
const tableOutDir = path.join(root, "public/images/cabinet/production");

const LED_WIDTH = 1920;
const LED_HEIGHT = 350;
const TABLE_SOURCE_WIDTH = 1781;
const TABLE_SOURCE_HEIGHT = 883;
const TABLE_RUNTIME_WIDTH = 1120;
const TABLE_RUNTIME_HEIGHT = 420;
const TABLE_MOUNT_X = 380;
const TABLE_ELEMENT_HEIGHT = 350;
const TABLE_DEPTH_SCALE =
  Math.sin((60 * Math.PI) / 180) / Math.sin((29 * Math.PI) / 180);
const TABLE_PITCH_OFFSET_Y = -(TABLE_DEPTH_SCALE - 1) * 105;

const svgMask = (width, height, pathData) =>
  Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <path d="${pathData}" fill="#fff"/>
    </svg>
  `);

const applyMask = async (source, mask) =>
  sharp(source)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

const writePngAndWebp = async (buffer, basePath, webpQuality = 94) => {
  await sharp(buffer).png().toFile(`${basePath}.png`);
  await sharp(buffer)
    .webp({ quality: webpQuality, alphaQuality: 100 })
    .toFile(`${basePath}.webp`);
};

await fs.mkdir(outDir, { recursive: true });

// Keep the complete table face and front rim, then taper into the central
// lower mechanism. This removes the wide side machinery without cutting
// through the visible table silhouette.
const tableMask = svgMask(
  TABLE_SOURCE_WIDTH,
  TABLE_SOURCE_HEIGHT,
  [
    "M 314 38",
    "L 1483 38",
    "L 1542 94",
    "L 1724 536",
    "L 1630 592",
    "L 1472 604",
    "L 1472 883",
    "L 309 883",
    "L 309 604",
    "L 151 592",
    "L 57 536",
    "L 239 94",
    "Z",
  ].join(" "),
);
const tableMasked = await applyMask(tableSource, tableMask);
const tableRuntime = await sharp(tableMasked)
  .resize(TABLE_RUNTIME_WIDTH, TABLE_RUNTIME_HEIGHT, { fit: "fill" })
  .png()
  .toBuffer();
const tableBasePath = path.join(
  tableOutDir,
  "card-table-premium-three-bay-center-only-1120x420",
);
await writePngAndWebp(tableRuntime, tableBasePath, 96);

// The inner cuts live beneath the table layer. Their generous overlap keeps
// all four LED states aligned without exposing a seam during scaling.
const leftPanelMask = svgMask(
  LED_WIDTH,
  LED_HEIGHT,
  "M 0 0 H 574 L 540 350 H 0 Z",
);
const rightPanelMask = svgMask(
  LED_WIDTH,
  LED_HEIGHT,
  "M 1346 0 H 1920 V 350 H 1380 Z",
);
const centerBridgeMask = svgMask(
  LED_WIDTH,
  LED_HEIGHT,
  "M 500 0 H 1420 V 350 H 500 Z",
);

const [leftOn, rightOn, leftOff, rightOff, centerBridge] = await Promise.all([
  applyMask(ledOnSource, leftPanelMask),
  applyMask(ledOnSource, rightPanelMask),
  applyMask(ledOffSource, leftPanelMask),
  applyMask(ledOffSource, rightPanelMask),
  applyMask(ledOffSource, centerBridgeMask),
]);

await Promise.all([
  writePngAndWebp(leftOn, path.join(outDir, "lower-cabinet-led-left-on-v3")),
  writePngAndWebp(rightOn, path.join(outDir, "lower-cabinet-led-right-on-v3")),
  writePngAndWebp(leftOff, path.join(outDir, "lower-cabinet-led-left-off-v3")),
  writePngAndWebp(rightOff, path.join(outDir, "lower-cabinet-led-right-off-v3")),
  writePngAndWebp(
    centerBridge,
    path.join(outDir, "lower-cabinet-center-bridge-v3"),
  ),
]);

const buildPreview = async (poweredOn) => {
  const tableElementCrop = await sharp(tableRuntime)
    .extract({
      left: 0,
      top: 0,
      width: TABLE_RUNTIME_WIDTH,
      height: TABLE_ELEMENT_HEIGHT,
    })
    .resize(
      TABLE_RUNTIME_WIDTH,
      Math.round(TABLE_ELEMENT_HEIGHT * TABLE_DEPTH_SCALE),
      { fit: "fill" },
    )
    .png()
    .toBuffer();
  const visibleTable = await sharp(tableElementCrop)
    .extract({
      left: 0,
      top: Math.round(-TABLE_PITCH_OFFSET_Y),
      width: TABLE_RUNTIME_WIDTH,
      height: LED_HEIGHT,
    })
    .png()
    .toBuffer();

  const layers = [
    { input: centerBridge, left: 0, top: 0 },
    { input: leftOff, left: 0, top: 0 },
    { input: rightOff, left: 0, top: 0 },
  ];
  if (poweredOn) {
    layers.push(
      { input: leftOn, left: 0, top: 0 },
      { input: rightOn, left: 0, top: 0 },
    );
  }
  layers.push({ input: visibleTable, left: TABLE_MOUNT_X, top: 0 });

  return sharp({
    create: {
      width: LED_WIDTH,
      height: LED_HEIGHT,
      channels: 4,
      background: { r: 3, g: 4, b: 5, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
};

const [onPreview, offPreview] = await Promise.all([
  buildPreview(true),
  buildPreview(false),
]);
await sharp(onPreview)
  .png()
  .toFile(path.join(outDir, "lower-cabinet-led-v3-on-layered-preview.png"));
await sharp(offPreview)
  .png()
  .toFile(path.join(outDir, "lower-cabinet-led-v3-off-layered-preview.png"));

console.log(`Built lower cabinet LED v3 assets in ${outDir}`);
