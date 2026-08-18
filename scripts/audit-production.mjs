import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(repositoryRoot, "dist");
const failures = [];
let checkCount = 0;

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else files.push(entryPath);
  }
  return files;
}

function check(condition, description) {
  checkCount += 1;
  if (condition) console.log(`PASS  ${description}`);
  else {
    console.error(`FAIL  ${description}`);
    failures.push(description);
  }
}

function readPngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const indexPath = path.join(distDirectory, "index.html");
check(await fileExists(indexPath), "dist/index.html exists");
if (!(await fileExists(indexPath))) process.exit(1);

const files = await listFiles(distDirectory);
const relativeFiles = files.map((file) => path.relative(distDirectory, file));
const indexHtml = await readFile(indexPath, "utf8");

check(
  relativeFiles.some((file) => file.startsWith("assets/")),
  "hashed application assets exist",
);
check(
  indexHtml.includes('rel="canonical" href="https://meiirorazalin.com/"'),
  "canonical URL is exact",
);
check(indexHtml.includes('property="og:title"'), "Open Graph title exists");
check(indexHtml.includes('property="og:description"'), "Open Graph description exists");
check(
  indexHtml.includes('property="og:url" content="https://meiirorazalin.com/"'),
  "Open Graph URL is exact",
);
check(
  indexHtml.includes('property="og:image" content="https://meiirorazalin.com/social-preview.png"'),
  "Open Graph image is exact",
);
check(
  indexHtml.includes('name="twitter:card" content="summary_large_image"'),
  "Twitter card exists",
);
check(indexHtml.includes('name="twitter:title"'), "Twitter title exists");
check(indexHtml.includes('name="twitter:description"'), "Twitter description exists");
check(indexHtml.includes('name="twitter:image"'), "Twitter image exists");
check(indexHtml.includes('rel="manifest" href="/site.webmanifest"'), "manifest reference exists");
check(indexHtml.includes('rel="icon" href="/favicon.svg"'), "favicon reference exists");
check(indexHtml.includes("/social-preview.png"), "social-preview reference exists");

for (const requiredFile of [
  "favicon.svg",
  "icon-192.png",
  "icon-512.png",
  "social-preview.png",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
  "audio/audio-manifest.json",
]) {
  check(relativeFiles.includes(requiredFile), `${requiredFile} exists`);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(distDirectory, "site.webmanifest"), "utf8"));
  check(true, "manifest JSON parses");
} catch {
  check(false, "manifest JSON parses");
}
check(manifest?.start_url === "/", "manifest start_url is /");
check(manifest?.scope === "/", "manifest scope is /");

const expectedPngs = [
  ["social-preview.png", 1200, 630],
  ["icon-192.png", 192, 192],
  ["icon-512.png", 512, 512],
];
for (const [filename, width, height] of expectedPngs) {
  const filePath = path.join(distDirectory, filename);
  if (!(await fileExists(filePath))) continue;
  const dimensions = readPngDimensions(await readFile(filePath));
  check(Boolean(dimensions), `${filename} is a PNG`);
  check(
    dimensions?.width === width && dimensions?.height === height,
    `${filename} dimensions are ${width} × ${height}`,
  );
}

const applicationReferences = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"?]+)[^"]*"/g)];
check(applicationReferences.length > 0, "built application assets use root-relative paths");
check(!indexHtml.includes("/Dungeon-Escape/"), "repository-name base is absent");

const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);
const textFiles = files.filter((file) => {
  const extension = path.extname(file);
  return textExtensions.has(extension) || file.endsWith(".webmanifest");
});
const textContent = (await Promise.all(textFiles.map((file) => readFile(file, "utf8")))).join("\n");

check(!textContent.includes("localhost"), "localhost URLs are absent");
check(!textContent.includes("127.0.0.1"), "loopback URLs are absent");
check(
  !/(?:src|href)=["']http:\/\//i.test(textContent),
  "insecure HTTP application assets are absent",
);
check(!relativeFiles.some((file) => file.endsWith(".map")), "source maps are absent");
check(!textContent.includes("sourceMappingURL="), "source-map references are absent");
check(
  !relativeFiles.some((file) =>
    /(^|\/)(playwright-report|test-results|screenshots|traces)(\/|$)/.test(file),
  ),
  "test reports, screenshots, and traces are absent",
);
check(
  !relativeFiles.some((file) => /(^|\/)\.env(?:\.|$)/.test(file)),
  "environment files are absent",
);
check(
  !relativeFiles.some((file) => /\.(?:tmp|raw|source)$/i.test(file)),
  "temporary audio-generation artifacts are absent",
);

let audioManifest;
try {
  audioManifest = JSON.parse(
    await readFile(path.join(distDirectory, "audio", "audio-manifest.json"), "utf8"),
  );
  check(audioManifest.contractVersion === 1, "audio manifest contract version is valid");
} catch {
  check(false, "audio manifest contract version is valid");
}
const audioEntries = Array.isArray(audioManifest?.files) ? audioManifest.files : [];
check(
  audioEntries.filter((entry) => entry.kind === "ambience").length === 3,
  "exactly three production ambience entries exist",
);
check(
  audioEntries.filter((entry) => entry.kind === "effect").length === 19,
  "all nineteen production effect entries exist",
);
let deployedAudioBytes = 0;
for (const entry of audioEntries) {
  const audioPath = path.join(distDirectory, entry.path);
  const exists = await fileExists(audioPath);
  check(exists, `${entry.path} is deployed`);
  if (!exists) continue;
  const audio = await readFile(audioPath);
  deployedAudioBytes += audio.byteLength;
  check(
    audio.subarray(0, 4).toString("ascii") === "RIFF" &&
      audio.subarray(8, 12).toString("ascii") === "WAVE",
    `${entry.path} has a WAV header`,
  );
}
check(deployedAudioBytes <= 3.5 * 1024 * 1024, "deployed audio remains within 3.5 MB");
check(
  !JSON.stringify(audioManifest ?? {}).includes("http://") &&
    !JSON.stringify(audioManifest ?? {}).includes("https://"),
  "audio manifest has no external audio URL",
);

const javascriptFiles = files.filter((file) => file.endsWith(".js"));
const vendorFiles = javascriptFiles.filter((file) =>
  path.basename(file).startsWith("phaser-vendor-"),
);
const applicationFiles = javascriptFiles.filter((file) => !vendorFiles.includes(file));
check(vendorFiles.length === 1, "Phaser is isolated into one vendor chunk");
check(applicationFiles.length >= 1, "application JavaScript is separate from Phaser");
const applicationBytes = (
  await Promise.all(applicationFiles.map(async (file) => (await stat(file)).size))
).reduce((total, size) => total + size, 0);
check(applicationBytes < 350_000, "application-owned minified JavaScript is below 350 kB");
const javascriptReports = await Promise.all(
  javascriptFiles.map(async (file) => {
    const content = await readFile(file);
    return {
      file: path.relative(distDirectory, file),
      bytes: content.byteLength,
      gzipBytes: gzipSync(content).byteLength,
    };
  }),
);
javascriptReports.forEach(({ file, bytes, gzipBytes }) => {
  console.log(`SIZE  ${file}: ${bytes} bytes (${gzipBytes} gzip)`);
});
console.log(
  `SIZE  JavaScript total: ${javascriptReports.reduce((sum, item) => sum + item.bytes, 0)} bytes (${javascriptReports.reduce((sum, item) => sum + item.gzipBytes, 0)} gzip)`,
);
console.log(`SIZE  Audio total: ${deployedAudioBytes} bytes`);

for (const identifier of [
  "__DUNGEON_ESCAPE_E2E__",
  "installE2EBridge",
  "teleportToTarget",
  "teleportNearEnemy",
  "teleportOntoEnemy",
  "teleportToChest",
  "teleportToForge",
  "teleportToPickup",
]) {
  check(!textContent.includes(identifier), `${identifier} is absent`);
}

if (failures.length > 0) {
  console.error(`Production audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(
  `Production audit passed: ${checkCount} checks, ${files.length} deployed files inspected.`,
);
