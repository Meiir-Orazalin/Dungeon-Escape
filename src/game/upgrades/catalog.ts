import type { UpgradeDefinition, UpgradeId } from "./types";

export const UPGRADE_CATALOG_VERSION = 1;

export const UPGRADE_CATALOG: readonly UpgradeDefinition[] = Object.freeze([
  Object.freeze({
    id: "tempered-edge",
    name: "TEMPERED EDGE",
    shortName: "EDGE",
    description: "Sword damage increases by 1.",
    effectSummary: "MELEE DAMAGE  1 → 2",
    displayOrder: 0,
  }),
  Object.freeze({
    id: "long-reach",
    name: "LONG REACH",
    shortName: "REACH",
    description: "Sword range increases.",
    effectSummary: "MELEE RANGE  58 → 76",
    displayOrder: 1,
  }),
  Object.freeze({
    id: "quickened-steel",
    name: "QUICKENED STEEL",
    shortName: "QUICK",
    description: "Sword recovery and cooldown become faster.",
    effectSummary: "RECOVERY 75 MS · COOLDOWN 260 MS",
    displayOrder: 2,
  }),
  Object.freeze({
    id: "fleet-sigil",
    name: "FLEET SIGIL",
    shortName: "FLEET",
    description: "Dash recovers more quickly.",
    effectSummary: "DASH COOLDOWN  900 → 650 MS",
    displayOrder: 3,
  }),
  Object.freeze({
    id: "vital-rune",
    name: "VITAL RUNE",
    shortName: "VITAL",
    description: "Maximum health increases and one health is restored.",
    effectSummary: "MAX HEALTH +1 · RESTORE 1",
    displayOrder: 4,
  }),
  Object.freeze({
    id: "aegis-rune",
    name: "AEGIS RUNE",
    shortName: "AEGIS",
    description: "Post-hit protection lasts longer.",
    effectSummary: "INVULNERABILITY  850 → 1150 MS",
    displayOrder: 5,
  }),
]);

export const UPGRADE_IDS: readonly UpgradeId[] = Object.freeze(
  UPGRADE_CATALOG.map((upgrade) => upgrade.id),
);

export function getUpgrade(id: UpgradeId): UpgradeDefinition {
  const upgrade = UPGRADE_CATALOG.find((candidate) => candidate.id === id);
  if (!upgrade) throw new RangeError(`Unknown upgrade ID: ${id}.`);
  return upgrade;
}

export function isUpgradeId(value: string): value is UpgradeId {
  return UPGRADE_IDS.includes(value as UpgradeId);
}

export function stableUpgradeIds(ids: readonly UpgradeId[]): readonly UpgradeId[] {
  return Object.freeze(
    [...ids].sort((left, right) => getUpgrade(left).displayOrder - getUpgrade(right).displayOrder),
  );
}
