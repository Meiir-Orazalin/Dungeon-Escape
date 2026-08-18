import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const failures = [];
let checks = 0;
const check = (condition, description) => {
  checks += 1;
  if (condition) console.log(`PASS  ${description}`);
  else {
    console.error(`FAIL  ${description}`);
    failures.push(description);
  }
};
const text = async (relative) => readFile(path.join(root, relative), "utf8");
const exists = async (relative) => {
  try {
    return (await stat(path.join(root, relative))).isFile();
  } catch {
    return false;
  }
};
const walk = async (directory) => {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await walk(target)));
    else results.push(target);
  }
  return results;
};

const packageJson = JSON.parse(await text("package.json"));
const lock = await text("pnpm-lock.yaml");
const readme = await text("README.md");
const implementation = await text("docs/IMPLEMENTATION_PLAN.md");
const phase = await text("docs/PHASE_STATUS.md");
const notes = await text("docs/RELEASE_NOTES_1.0.0.md");
const vite = await text("vite.config.ts");
const index = await text("index.html");
check(packageJson.version === "1.0.0", "package version is 1.0.0");
check(
  lock.includes("specifier: 4.2.1") && lock.includes("specifier: 1.62.1"),
  "pnpm lockfile contains the synchronized pinned dependency graph",
);
check(readme.includes("v1.0.0"), "README identifies v1.0.0");
check(readme.includes("https://meiirorazalin.com/"), "README links production");
for (const file of [
  "CHANGELOG.md",
  "docs/RELEASE_NOTES_1.0.0.md",
  "docs/BROWSER_SUPPORT.md",
  "docs/RELEASE_HARDENING.md",
  "docs/RELEASE_CHECKLIST.md",
])
  check(await exists(file), `${file} exists`);
check(
  implementation.includes("Phase 8") && implementation.includes("Complete"),
  "implementation plan marks Phase 8 complete",
);
check(phase.includes("1.0.0") && phase.includes("Phase 8"), "phase status identifies v1.0.0");
check(vite.includes('base: "/"'), "Vite base remains root");
check(index.includes('href="https://meiirorazalin.com/"'), "canonical metadata remains exact");
check(packageJson.dependencies?.phaser === "4.2.1", "Phaser remains pinned at 4.2.1");
check(await exists("public/audio/audio-manifest.json"), "audio manifest remains present");
check(
  packageJson.scripts?.["audit:audio"] === "node scripts/audit-audio.mjs",
  "audio audit script remains represented",
);
check(
  packageJson.scripts?.["test:e2e:release"]?.includes("playwright.release.config.ts"),
  "cross-browser release script exists",
);
check(
  packageJson.scripts?.["test:e2e:canvas"]?.includes("playwright.canvas.config.ts"),
  "Canvas fallback script exists",
);
check(
  packageJson.scripts?.["test:soak"]?.includes("playwright.soak.config.ts"),
  "lifecycle soak script exists",
);
const uppercaseReadme = readme.toUpperCase();
check(
  uppercaseReadme.includes("THE SHIFTING CATACOMBS") &&
    uppercaseReadme.includes("THE EMBER VAULTS") &&
    uppercaseReadme.includes("THE OBSIDIAN SANCTUM"),
  "three floor names remain documented",
);
check(readme.includes("eight") || readme.includes("Eight"), "eight upgrades remain documented");
check(
  !/(?:includes|supports|features) (?:save games|offline mode|controller support)/i.test(notes),
  "release notes avoid positive unsupported feature claims",
);

const files = await walk(dist);
const relative = files.map((file) => path.relative(dist, file));
const js = files.filter((file) => file.endsWith(".js"));
const reports = await Promise.all(
  js.map(async (file) => {
    const data = await readFile(file);
    return { file, bytes: data.byteLength, gzip: gzipSync(data).byteLength };
  }),
);
const vendor = reports.filter((item) => path.basename(item.file).startsWith("phaser-vendor-"));
const application = reports.filter((item) => !vendor.includes(item));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const allText = (
  await Promise.all(
    files
      .filter((file) => /\.(?:html|js|css|json|svg|xml|txt)$/.test(file))
      .map((file) => readFile(file, "utf8")),
  )
).join("\n");
const totalSite = sum(await Promise.all(files.map(async (file) => (await stat(file)).size)));
const audio = sum(
  await Promise.all(
    files.filter((file) => file.endsWith(".wav")).map(async (file) => (await stat(file)).size),
  ),
);
const largestNonAudio = Math.max(
  ...(await Promise.all(
    files
      .filter((file) => !file.includes(`${path.sep}audio${path.sep}`))
      .map(async (file) => (await stat(file)).size),
  )),
);
check(vendor.length === 1, "exactly one Phaser vendor chunk exists");
check(
  sum(application.map((item) => item.bytes)) <= 300_000,
  "application JavaScript budget passes",
);
check(sum(vendor.map((item) => item.bytes)) <= 1_450_000, "Phaser vendor budget passes");
check(sum(reports.map((item) => item.gzip)) <= 450_000, "gzip JavaScript budget passes");
check(audio <= 3_500_000, "audio budget passes");
check(totalSite <= 6_500_000, "site budget passes");
check(largestNonAudio <= 1_500_000, "single non-audio asset budget passes");
check(!relative.some((file) => file.endsWith(".map")), "source maps are absent");
check(
  !relative.some((file) => /(playwright-report|test-results|trace|screenshot)/i.test(file)),
  "test artifacts are absent",
);
check(!relative.some((file) => /(^|\/)\.env/.test(file)), "environment files are absent");
check(
  !allText.includes("localhost") && !allText.includes("127.0.0.1"),
  "localhost references are absent",
);
check(
  !/(?:src|href)=["']https?:\/\/(?!meiirorazalin\.com)/i.test(allText),
  "external runtime assets are absent",
);
check(!allText.includes("/Dungeon-Escape/"), "repository-name base is absent");
for (const id of [
  "__DUNGEON_ESCAPE_E2E__",
  "installE2EBridge",
  "VITE_E2E_RENDERER",
  "__renderer_fatal",
  "collectLifecycleDiagnostics",
  "LifecycleDiagnostics",
])
  check(!allText.includes(id), `${id} is absent from production`);
check(
  !allText.includes("stack trace") && !allText.includes("STACK_TRACE"),
  "fatal UI contains no stack placeholder",
);
check(
  (await text("src/game/platform/version.ts")).includes("__APP_VERSION__"),
  "release version has one compile-time source",
);
console.log(`SIZE  Application JavaScript: ${sum(application.map((item) => item.bytes))} bytes`);
console.log(`SIZE  Phaser vendor: ${sum(vendor.map((item) => item.bytes))} bytes`);
console.log(`SIZE  JavaScript gzip: ${sum(reports.map((item) => item.gzip))} bytes`);
console.log(`SIZE  Audio: ${audio} bytes`);
console.log(`SIZE  Site: ${totalSite} bytes`);
if (failures.length) {
  console.error(`Release audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log(`Release audit passed: ${checks} checks.`);
