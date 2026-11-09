import assert from "node:assert/strict";
import { test } from "node:test";
import { statSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const ffmpeg = fileURLToPath(new URL(".codex/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe", root));
const scene = readFileSync(new URL("components/battle/BattleSpawnScene.tsx", root), "utf8");
for (const [id, word, count] of [[3,"three",121],[5,"five",83],[9,"nine",123],
  [10,"ten",84],[11,"eleven",120],[12,"twelve",120],[13,"thirteen",120]]) {
  test(`Enemy ${id} has its own playable 960-square alpha video and poster (${count} frames)`, () => {
    assert.ok(scene.includes(`${id}: enemyVideoPreset(${id}, "${word}", ${count})`));
    const video = new URL(`public/images/battle-characters/enemy-${word}/enemy-${word}-idle.webm`, root);
    assert.ok(statSync(new URL(`public/images/battle-characters/enemy-${word}/poster.png`, root)).size > 0);
    const result = spawnSync(ffmpeg, ["-hide_banner", "-c:v", "libvpx-vp9", "-i", fileURLToPath(video),
      "-vf", "alphaextract", "-f", "null", "-"], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /960x960/);
    assert.match(result.stderr, /25 fps/);
    assert.match(result.stderr, /alpha_mode\s*:\s*1/);
    const frames = [...result.stderr.matchAll(/frame=\s*(\d+)/g)].map(match => Number(match[1]));
    assert.equal(frames.at(-1), count);
  });
}
