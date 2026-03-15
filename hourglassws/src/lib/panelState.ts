import type { PanelState } from './reanimated-presets';
export type { PanelState };

/** Fraction of expected pace considered "on track" (within 15% of pace). */
export const PACING_ON_TRACK_THRESHOLD = 0.85;

/** Fraction of expected pace considered "recoverable behind" (60–84% of pace). */
export const PACING_BEHIND_THRESHOLD = 0.60;

/**
 * Computes which of the 6 Hourglass panel states applies to the current week.
 *
 * Panel states (in evaluation priority):
 *   idle      — No work started yet, or contractual limit is zero.
 *   overtime  — Hours worked strictly exceed the weekly limit (hours > limit).
 *   crushedIt — Hours worked exactly meet the weekly limit (hours === limit).
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
 * @returns One of: "onTrack" | "behind" | "critical" | "crushedIt" | "idle" | "overtime"
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

  // Strictly exceeded — overtime celebration (higher priority than crushedIt).
  if (hours > weeklyLimit) return 'overtime';

  // Goal exactly met — crushed it.
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

/**
 * Returns the number of work days elapsed in the current week (Mon–Fri).
 *
 * Uses local timezone (getDay / getHours / getMinutes / getSeconds).
 *
 * Returns 0–5:
 *   0 — Monday at exactly 00:00:00 (week just started, no day has elapsed yet)
 *   1 — Monday (any time after midnight)
 *   2 — Tuesday
 *   3 — Wednesday
 *   4 — Thursday
 *   5 — Friday, Saturday, or Sunday (weekend clamped to 5)
 *
 * @param now  Optional Date to use (defaults to new Date()).
 */
export function computeDaysElapsed(now?: Date): number {
  const d = now ?? new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  // Weekend — clamp to 5
  if (day === 0 || day === 6) return 5;

  // Friday through Saturday already handled above; day is now 1–5 (Mon–Fri)
  // Friday
  if (day === 5) return 5;

  // Thursday
  if (day === 4) return 4;

  // Wednesday
  if (day === 3) return 3;

  // Tuesday
  if (day === 2) return 2;

  // Monday (day === 1)
  // Special edge: Monday at exactly midnight → 0 (week hasn't started)
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return 0;
  }
  return 1;
}
