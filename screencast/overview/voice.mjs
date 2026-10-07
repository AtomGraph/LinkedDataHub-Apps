// The overview's narration, synthesised one line at a time.
//
// SCRIPT.md is the source: every table row whose first cell is a shot id (0.1, A1 … Z1)
// carries one line of narration, and the Pronunciation table says how the acronyms are
// respelled for the voice — in the text sent to the API only, never in the script or the
// subtitles. Each line goes to ElevenLabs on its own, so its length is known before any
// shot is recorded: the voice sets the timing, and the picture is cut to it.
//
// Every take is cached under a hash of voice, model and the spoken text, in
// tracks/overview/voice/, so an unchanged line is never billed twice and a render is
// reproducible. The with-timestamps endpoint is used, so each take also keeps its
// character alignment for the subtitles.
//
//   node overview/voice.mjs [--api-key-file ~/.config/elevenlabs/api-key] [--dry-run]
//
// Writes tracks/overview/voice.json — id, text, spoken, file, seconds per line — and
// prints the lengths.

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { TRACKS } from '../lib/harness.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SCRIPT = path.join(HERE, 'SCRIPT.md');
const OUT = path.join(TRACKS, 'overview');
const CACHE = path.join(OUT, 'voice');

const VOICE = 'onwK4e9ZLuTAKqWW03F9'; // Daniel
const MODEL = 'eleven_multilingual_v2';
const FORMAT = 'mp3_44100_128';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const dryRun = args.includes('--dry-run');
const keyFile = flag('--api-key-file', path.join(os.homedir(), '.config/elevenlabs/api-key'));

// ── the script ──────────────────────────────────────────────────────────────────

const md = await fs.readFile(SCRIPT, 'utf8');

const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());

const lines = [];
const pronunciation = [];
let section = null;
for (const raw of md.split('\n')) {
  if (raw.startsWith('## ')) section = raw.slice(3).trim();
  if (!raw.startsWith('|')) continue;
  const c = cells(raw);
  if (section === 'Pronunciation') {
    if (c.length === 2 && c[0] !== 'Written' && !/^-+$/.test(c[0])) {
      pronunciation.push({ written: c[0].replace(/`/g, ''), spoken: c[1].replace(/\s*\(.*\)$/, '') });
    }
    continue;
  }
  if (c.length === 3 && /^(0\.\d|[A-Z]\d[a-z]?)$/.test(c[0])) lines.push({ id: c[0], screen: c[1], text: c[2] });
}
if (lines.length === 0) throw new Error(`no narration rows found in ${SCRIPT}`);

// One pass over the text, matching the longest written form first, so "RDFa" is taken
// whole by its own row and never has "RDF" respelled inside it by the shorter one.
pronunciation.sort((a, b) => b.written.length - a.written.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const written = new RegExp(pronunciation.map((p) => escape(p.written)).join('|'), 'g');
const spokenFor = new Map(pronunciation.map((p) => [p.written, p.spoken]));
const respell = (text) => text.replace(written, (m) => spokenFor.get(m));

// ── the voice ───────────────────────────────────────────────────────────────────

const takeFor = (spoken) => createHash('sha1').update(`${VOICE}\n${MODEL}\n${spoken}`).digest('hex');

async function synthesise(apiKey, spoken) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=${FORMAT}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: spoken, model_id: MODEL }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  const body = await res.json();
  return { audio: Buffer.from(body.audio_base64, 'base64'), alignment: body.alignment };
}

// The length comes from the alignment — the end of the last character — rather than from
// ffprobe, so a dry run over a warm cache needs no ffmpeg.
const secondsOf = (alignment) => {
  const ends = alignment?.character_end_times_seconds ?? [];
  return ends.length ? ends[ends.length - 1] : null;
};

await fs.mkdir(CACHE, { recursive: true });
let apiKey = null;
let billed = 0;
const out = [];

for (const line of lines) {
  const spoken = respell(line.text);
  const take = takeFor(spoken);
  const mp3 = path.join(CACHE, `${take}.mp3`);
  const json = path.join(CACHE, `${take}.json`);
  let alignment;
  try {
    alignment = JSON.parse(await fs.readFile(json, 'utf8'));
  } catch {
    if (dryRun) {
      out.push({ ...line, spoken, file: null, seconds: null });
      continue;
    }
    apiKey ??= (await fs.readFile(keyFile, 'utf8')).trim();
    const { audio, alignment: a } = await synthesise(apiKey, spoken);
    await fs.writeFile(mp3, audio);
    await fs.writeFile(json, JSON.stringify(a));
    alignment = a;
    billed += spoken.length;
  }
  out.push({ ...line, spoken, file: path.relative(TRACKS, mp3), seconds: secondsOf(alignment) });
}

await fs.writeFile(path.join(OUT, 'voice.json'), JSON.stringify(out, null, 2));

const words = (t) => t.split(/\s+/).length;
let total = 0;
for (const l of out) {
  total += l.seconds ?? 0;
  const s = l.seconds == null ? '   (not synthesised)' : `${l.seconds.toFixed(1).padStart(5)} s`;
  console.log(`${l.id.padEnd(4)} ${s}  ${String(words(l.text)).padStart(2)} words  ${l.text.slice(0, 70)}${l.text.length > 70 ? '…' : ''}`);
}
console.log(`\n${out.length} lines, ${(total / 60).toFixed(1)} min of speech, ${billed} characters billed this run`);
