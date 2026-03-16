// overviewUtils.ts — 03-overview-hero FR3
//
// Pure utility functions for the Overview tab.
// computeEarningsPace: computes earnings pace ratio (current week vs prior average).
// Used by overview.tsx to determine AmbientBackground color signal.
//
// Ratio interpretation (maps to getAmbientColor earningsPace signal):
//   ≥ 0.85 → gold (strong pace)
//   0.60–0.84 → warning (behind pace)
//   < 0.60 → critical (significantly behind)
//   length < 2 → 1.0 (no prior data, assume strong)

/**
 * Computes the earnings pace ratio: last entry of earnings[] divided by
 * the average of all prior entries.
 *
 * @param earnings - Weekly earnings array ordered oldest→newest.
 *   Length = selected window (4 or 12). Last entry = current week.
 * @returns Ratio ≥ 0. Returns 1.0 for empty/single arrays (no prior = assume strong).
 *
 * Edge cases:
 *   - length < 2 → 1.0 (no prior periods to compare)
 *   - prior avg = 0 → 1.0 (all prior weeks zero = assume strong)
 */
export function computeEarningsPace(earnings: number[]): number {
  if (earnings.length < 2) return 1.0;
  const prior = earnings.slice(0, -1);
  const priorAvg = prior.reduce((sum, val) => sum + val, 0) / prior.length;
  if (priorAvg === 0) return 1.0;
  return earnings[earnings.length - 1] / priorAvg;
}
