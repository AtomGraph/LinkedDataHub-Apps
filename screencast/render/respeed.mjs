// Rescale a marks sidecar to match a sped-up render, so the edit list still points
// at the right frames. A 2x video has every beat at half its original timestamp.
//
//   node render/respeed.mjs tracks/scene.marks.json 2 tracks/scene-2x.marks.json

import fs from 'node:fs/promises';

const [, , src, speedArg, dest] = process.argv;
if (!src || !speedArg || !dest) {
  console.error('usage: respeed.mjs <marks.json> <speed> <out.json>');
  process.exit(2);
}

const speed = Number(speedArg);
if (!(speed > 0)) {
  console.error(`speed must be a positive number, got ${speedArg}`);
  process.exit(2);
}

const marks = JSON.parse(await fs.readFile(src, 'utf8'));
const scaled = {
  ...marks,
  speed,
  sourceDuration: marks.duration,
  duration: marks.duration / speed,
  beats: marks.beats.map((b) => ({ ...b, at: Number((b.at / speed).toFixed(3)) })),
};

await fs.writeFile(dest, JSON.stringify(scaled, null, 2) + '\n');
console.log(`${dest}  ${marks.beats.length} beats, ${marks.duration.toFixed(1)}s → ${scaled.duration.toFixed(1)}s at ${speed}x`);
