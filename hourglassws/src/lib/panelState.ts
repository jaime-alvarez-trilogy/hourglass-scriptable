import type { PanelState } from './reanimated-presets';
export type { PanelState };

/** Fraction of expected pace considered "on track" (within 15% of pace). */
export const PACING_ON_TRACK_THRESHOLD = 0.85;

/** Fraction of expected pace considered "recoverable behind" (40–85% of pace). */
export const PACING_BEHIND_THRESHOLD = 0.60;

/**
 * Computes which of the 5 Hourglass panel states applies to the current week.
 *
 * Panel states (in evaluation priority):
 *   idle      — No work started yet, or contractual limit is zero.
 *   crushedIt — Hours worked already meet or exceed the weekly limit.
 *   onTrack   — Pacing at ≥ 85% of expected hours for the days elapsed.
 *   behind    — Pacing at 60–84% of expected hours (recoverable).
 *   critical  — Pacing below 60% of expected hours (severe deficit).
 *
 * @param hoursWorked  Hours logged so far this week (e.g. 28.5).
 * @param weeklyLimit  Contractual weekly hour target (e.g. 40).
 * @param daysElapsed  Work days elapsed Mon–Fri. 0 = Monday morning before
 *                     any work; 5 = Friday EOD or later. Values outside [0, 5]
 *                     are clamped.
 *
 * @returns One of: "onTrack" | "behind" | "critical" | "crushedIt" | "idle"
 */
export function computePanelState(
  hoursWorked: number,
  weeklyLimit: number,
  daysElapsed: number,
): PanelState {
  // Guard: zero or negative limit means no target — nothing to pace against.
  if (weeklyLimit <= 0) return 'idle';

  // Clamp inputs to valid ranges.
  const days = Math.max(0, Math.min(5, daysElapsed));
  const hours = Math.max(0, hoursWorked);

  // Goal reached or exceeded — celebrate.
  if (hours >= weeklyLimit) return 'crushedIt';

  // Monday morning with nothing logged — fresh week.
  if (days === 0 && hours === 0) return 'idle';

  // Hours logged before the first full day has elapsed (e.g. pre-Monday work
  // or very early Monday). Treat expected hours as 0 → worker is ahead.
  if (days === 0) return 'onTrack';

  const expectedHours = (days / 5) * weeklyLimit;
  const pacingRatio = hours / expectedHours;

  if (pacingRatio >= PACING_ON_TRACK_THRESHOLD) return 'onTrack';
  if (pacingRatio >= PACING_BEHIND_THRESHOLD) return 'behind';
  return 'critical';
}
