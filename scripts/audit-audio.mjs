import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDirectory = path.join(root, "public", "audio");
const manifestPath = path.join(audioDirectory, "audio-manifest.json");
const requiredAmbience = [
  "ambience-catacombs",
  "ambience-ember-vaults",
  "ambience-obsidian-sanctum",
];
const requiredEffects = [
  "ui-focus",
  "ui-confirm",
  "ui-back",
  "sword-swing",
  "dash",
  "enemy-hit",
  "enemy-defeat",
  "player-hit",
  "key-collected",
  "gate-sealed",
  "gate-ready",
  "chest-open",
  "shard-collected",
  "flask-heal",
  "forge-ready",
  "upgrade-selected",
  "floor-cleared",
  "run-victory",
  "run-defeat",
];
const failures = [];
let checks = 0;

function check(condition, description) {
  checks += 1;
  if (condition) console.log(`PASS  ${description}`);
  else {
    failures.push(description);
    console.error(`FAIL  ${description}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  check(true, "audio manifest exists and parses");
} catch {
  check(false, "audio manifest exists and parses");
  process.exit(1);
}

check(manifest.contractVersion === 1, "audio manifest contract version is 1");
check(Array.isArray(manifest.files), "audio manifest files are an array");
const entries = Array.isArray(manifest.files) ? manifest.files : [];
check(
  entries.filter((entry) => entry.kind === "ambience").length === 3,
  "exactly three ambience loops exist",
);
check(
  entries.filter((entry) => entry.kind === "effect").length === requiredEffects.length,
  "every required effect entry exists",
);
const ids = entries.map((entry) => entry.id);
check(new Set(ids).size === ids.length, "audio IDs are unique");
check(
  new Set(entries.map((entry) => entry.path)).size === entries.length,
  "audio paths are unique",
);
for (const id of [...requiredAmbience, ...requiredEffects])
  check(ids.includes(id), `${id}.wav is declared`);

let totalBytes = 0;
for (const entry of entries) {
  const filePath = path.join(root, "public", entry.path);
  let buffer;
  try {
    buffer = await readFile(filePath);
    check(true, `${entry.path} exists`);
  } catch {
    check(false, `${entry.path} exists`);
    continue;
  }
  totalBytes += buffer.byteLength;
  check(
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE",
    `${entry.id} has a RIFF/WAVE header`,
  );
  check(buffer.readUInt16LE(20) === 1, `${entry.id} uses PCM encoding`);
  check(buffer.readUInt16LE(22) === 1 && entry.channelCount === 1, `${entry.id} is mono`);
  check(buffer.readUInt16LE(34) === 16 && entry.bitsPerSample === 16, `${entry.id} is 16-bit`);
  check(
    buffer.readUInt32LE(24) === 22_050 && entry.sampleRate === 22_050,
    `${entry.id} uses 22050 Hz`,
  );
  check(buffer.byteLength === entry.byteSize, `${entry.id} byte size matches manifest`);
  check(
    createHash("sha256").update(buffer).digest("hex") === entry.sha256,
    `${entry.id} SHA-256 matches manifest`,
  );
  const duration = buffer.readUInt32LE(40) / (22_050 * 2);
  check(Math.abs(duration - entry.duration) < 0.001, `${entry.id} duration matches manifest`);
  check(
    entry.kind === "ambience" ? duration >= 10 && duration <= 14 : duration > 0 && duration <= 1.5,
    `${entry.id} duration is within budget`,
  );
}

check(totalBytes <= 3.5 * 1024 * 1024, "total audio size is at most 3.5 MB");
check(
  !JSON.stringify(manifest).includes("http://") && !JSON.stringify(manifest).includes("https://"),
  "audio manifest contains no external URL",
);
const names = await readdir(audioDirectory);
check(
  !names.some((name) => /\.(tmp|source|raw|html)$/i.test(name)),
  "no temporary generation artifact exists",
);
for (const name of names) {
  const info = await stat(path.join(audioDirectory, name));
  check(info.isFile(), `${name} is a regular file`);
}

if (failures.length > 0) {
  console.error(`Audio audit failed: ${failures.length} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`Audio audit passed: ${checks} checks, ${entries.length} files, ${totalBytes} bytes.`);
