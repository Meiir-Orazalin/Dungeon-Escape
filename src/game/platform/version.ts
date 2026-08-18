declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;

export interface ReleaseIdentity {
  readonly version: string;
  readonly label: string;
  readonly buildSha: string | null;
}

export function shortenBuildSha(value: string | undefined): string | null {
  if (!value || !/^[0-9a-f]{7,64}$/i.test(value)) return null;
  return value.slice(0, 7).toLowerCase();
}

export function createReleaseIdentity(version: string, buildSha?: string): ReleaseIdentity {
  const normalized = /^\d+\.\d+\.\d+$/.test(version) ? version : "0.0.0";
  const shortSha = shortenBuildSha(buildSha);
  return Object.freeze({
    version: normalized,
    label: `v${normalized}${shortSha ? ` · ${shortSha}` : ""}`,
    buildSha: shortSha,
  });
}

const compiledVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
const compiledBuildSha = typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "";

export const RELEASE_IDENTITY = createReleaseIdentity(compiledVersion, compiledBuildSha);
