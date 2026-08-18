export const RELEASE_BUDGETS = Object.freeze({
  applicationJavaScriptBytes: 300_000,
  phaserVendorBytes: 1_450_000,
  totalJavaScriptGzipBytes: 450_000,
  totalAudioBytes: 3_500_000,
  totalSiteBytes: 6_500_000,
  singleNonAudioAssetBytes: 1_500_000,
});

export function withinReleaseBudget(value: number, maximum: number): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value < 0 || maximum < 0)
    throw new RangeError("Release budget values must be finite and non-negative.");
  return value <= maximum;
}
