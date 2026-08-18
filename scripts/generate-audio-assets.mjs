import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "audio");
const sampleRate = 22_050;

const assets = [
  ["ambience-catacombs", "ambience", 10.5],
  ["ambience-ember-vaults", "ambience", 11],
  ["ambience-obsidian-sanctum", "ambience", 11.5],
  ["ui-focus", "effect", 0.1],
  ["ui-confirm", "effect", 0.16],
  ["ui-back", "effect", 0.14],
  ["sword-swing", "effect", 0.26],
  ["dash", "effect", 0.28],
  ["enemy-hit", "effect", 0.22],
  ["enemy-defeat", "effect", 0.34],
  ["player-hit", "effect", 0.3],
  ["key-collected", "effect", 0.54],
  ["gate-sealed", "effect", 0.58],
  ["gate-ready", "effect", 0.72],
  ["chest-open", "effect", 0.48],
  ["shard-collected", "effect", 0.18],
  ["flask-heal", "effect", 0.5],
  ["forge-ready", "effect", 0.78],
  ["upgrade-selected", "effect", 0.85],
  ["floor-cleared", "effect", 0.92],
  ["run-victory", "effect", 1.35],
  ["run-defeat", "effect", 1.2],
];

function hashSeed(text) {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createNoise(seedText) {
  let state = hashSeed(seedText) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0xffffffff) * 2 - 1;
  };
}

function sine(frequency, time, phase = 0) {
  return Math.sin(Math.PI * 2 * frequency * time + phase);
}

function smoothEnvelope(time, duration, attack = 0.025, release = 0.08) {
  const fadeIn = Math.min(1, time / Math.max(attack, 0.001));
  const fadeOut = Math.min(1, (duration - time) / Math.max(release, 0.001));
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function ambienceSample(id, time, duration, noise) {
  const loopEnvelope = smoothEnvelope(time, duration, 0.3, 0.3);
  if (id === "ambience-catacombs") {
    const stone = sine(43, time) * 0.42 + sine(64.5, time, 0.7) * 0.17;
    const air = noise() * (0.04 + 0.02 * sine(0.19, time));
    const pulse = Math.max(0, sine(0.38, time)) * sine(172, time) * 0.035;
    return (stone * 0.2 + air + pulse) * loopEnvelope;
  }
  if (id === "ambience-ember-vaults") {
    const basalt = sine(48, time) * 0.32 + sine(72, time, 0.4) * 0.14;
    const furnace = noise() * (0.055 + 0.025 * Math.max(0, sine(0.14, time)));
    const metal = Math.max(0, sine(0.23, time + 0.8)) ** 8 * sine(311, time) * 0.045;
    return (basalt * 0.22 + furnace + metal) * loopEnvelope;
  }
  const drone = sine(36, time) * 0.4 + sine(54, time, 1.2) * 0.16;
  const movement = sine(0.11, time) * sine(88, time) * 0.035;
  const shimmer = Math.max(0, sine(0.17, time + 0.4)) ** 10 * sine(523, time) * 0.035;
  return (drone * 0.19 + movement + shimmer + noise() * 0.018) * loopEnvelope;
}

function effectSample(id, time, duration, noise) {
  const progress = time / duration;
  const envelope = smoothEnvelope(time, duration, 0.005, Math.min(0.12, duration * 0.55));
  const fall = Math.exp(-4.2 * progress);
  const riseFrequency = 120 + progress * 280;
  const downFrequency = 360 - progress * 250;
  const tonal = {
    "ui-focus": sine(440, time) * 0.16,
    "ui-confirm": sine(520 + progress * 180, time) * 0.2,
    "ui-back": sine(360 - progress * 120, time) * 0.17,
    "sword-swing": noise() * (1 - progress) * 0.2 + sine(180 + progress * 420, time) * 0.08,
    dash: noise() * (1 - progress) * 0.16 + sine(110 + progress * 90, time) * 0.1,
    "enemy-hit": sine(downFrequency, time) * 0.19 + noise() * 0.08,
    "enemy-defeat": sine(180 - progress * 90, time) * 0.2 + noise() * 0.07,
    "player-hit": sine(92, time) * 0.25 + noise() * 0.11,
    "key-collected": sine(riseFrequency, time) * 0.18 + sine(riseFrequency * 1.5, time) * 0.07,
    "gate-sealed": sine(74, time) * 0.22 + sine(111, time) * 0.08,
    "gate-ready": sine(110 + progress * 120, time) * 0.18 + sine(220 + progress * 240, time) * 0.06,
    "chest-open": noise() * fall * 0.13 + sine(145 + progress * 110, time) * 0.14,
    "shard-collected": sine(680 + progress * 240, time) * 0.16,
    "flask-heal": sine(240 + progress * 300, time) * 0.16 + sine(480 + progress * 150, time) * 0.05,
    "forge-ready": sine(86, time) * 0.15 + sine(258 + progress * 80, time) * 0.08,
    "upgrade-selected":
      sine(130 + progress * 260, time) * 0.17 + sine(390 + progress * 110, time) * 0.06,
    "floor-cleared":
      sine(105 + progress * 190, time) * 0.18 + sine(315 + progress * 95, time) * 0.055,
    "run-victory":
      sine(120 + progress * 220, time) * 0.17 + sine(360 + progress * 330, time) * 0.07,
    "run-defeat": sine(112 - progress * 65, time) * 0.2 + sine(56, time) * 0.08,
  }[id];
  if (typeof tonal !== "number" || !Number.isFinite(tonal))
    throw new Error(`No effect synthesizer for ${id}.`);
  return tonal * envelope * fall;
}

function encodeWav(id, kind, duration) {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new RangeError(`Invalid duration for ${id}.`);
  const sampleCount = Math.round(sampleRate * duration);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  const noise = createNoise(`dungeon-escape-audio-v1|${id}`);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const value =
      kind === "ambience"
        ? ambienceSample(id, time, duration, noise)
        : effectSample(id, time, duration, noise);
    const pcm = Math.round(Math.max(-1, Math.min(1, value)) * 32767);
    buffer.writeInt16LE(pcm, 44 + index * 2);
  }
  return buffer;
}

await mkdir(outputDirectory, { recursive: true });
const manifestEntries = [];
for (const [id, kind, duration] of assets) {
  const filename = `${id}.wav`;
  const buffer = encodeWav(id, kind, duration);
  await writeFile(path.join(outputDirectory, filename), buffer);
  manifestEntries.push({
    id,
    path: `audio/${filename}`,
    kind,
    sampleRate,
    channelCount: 1,
    bitsPerSample: 16,
    duration: Number(duration.toFixed(3)),
    byteSize: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}

const manifest = `${JSON.stringify({ contractVersion: 1, files: manifestEntries }, null, 2)}\n`;
await writeFile(path.join(outputDirectory, "audio-manifest.json"), manifest, "utf8");
const totalBytes = manifestEntries.reduce((total, entry) => total + entry.byteSize, 0);
console.log(`Generated ${manifestEntries.length} original audio files (${totalBytes} bytes).`);
