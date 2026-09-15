// Playwright cannot pause a recording, so every clip is trimmed in post. Rather
// than scrubbing a timeline for seven scenes, each scene emits its own edit list.
//
// Marks are keyed by beat id rather than by timestamp alone. For a single-track
// clip that only has to name the trim points; for the split-screen teaser the same
// sidecar becomes the alignment mechanism, since track A's `orders` mark meets
// track B's `orders` mark across two independently rendered passes.

import fs from 'node:fs/promises';
import path from 'node:path';

export class Marks {
  #t0;
  #shoot;

  constructor(sceneId) {
    this.sceneId = sceneId;
    this.entries = [];
    this.#t0 = null;
    this.#shoot = null;
  }

  // A beat boundary is exactly where a still is worth taking — the action has
  // settled and the frame means something. Attaching a shooter makes every scene
  // emit the docs screenshots as a by-product of filming.
  attach(shooter) {
    this.#shoot = shooter;
    return this;
  }

  // Called by the harness the moment the context exists, which is when the video
  // starts. Everything else is measured from here.
  start() {
    this.#t0 = Date.now();
    return this;
  }

  get elapsed() {
    return this.#t0 === null ? 0 : (Date.now() - this.#t0) / 1000;
  }

  // Awaitable so an attached shooter can finish before the scene moves on. Safe to
  // call without awaiting when no shooter is attached.
  async beat(id, note) {
    const at = this.elapsed;
    this.entries.push(note === undefined ? { beat: id, at } : { beat: id, at, note });
    process.stdout.write(`  ${at.toFixed(2).padStart(7)}s  ${id}${note ? `  — ${note}` : ''}\n`);
    if (this.#shoot) {
      const file = await this.#shoot(id, this.entries.length);
      if (file) this.entries.at(-1).shot = file;
    }
    return at;
  }

  async save(dir, trackName) {
    const file = path.join(dir, `${trackName}.marks.json`);
    const payload = {
      scene: this.sceneId,
      track: trackName,
      duration: this.elapsed,
      beats: this.entries,
    };
    await fs.writeFile(file, JSON.stringify(payload, null, 2) + '\n');
    return file;
  }
}
