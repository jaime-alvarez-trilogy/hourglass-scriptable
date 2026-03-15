// weeklyHistory.ts — 06-overview-history FR1
// Pure functions for reading, writing, and merging the weekly_history_v2 AsyncStorage store.
// Two hooks write to this store independently (useEarningsHistory, useAIData).
// One hook reads it (useWeeklyHistory).

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklySnapshot {
  weekStart: string;        // YYYY-MM-DD (Monday)
  hours: number;            // Total paid hours that week (0 if unknown)
  earnings: number;         // Total earnings that week (0 if unknown)
  aiPct: number;            // Midpoint AI% for the week (0 if unknown)
  brainliftHours: number;   // BrainLift hours for the week (0 if unknown)
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const WEEKLY_HISTORY_KEY = 'weekly_history_v2';
export const WEEKLY_HISTORY_MAX = 12;

// ─── mergeWeeklySnapshot ──────────────────────────────────────────────────────

/**
 * Merges a partial snapshot update into the history array.
 *
 * - If `partial.weekStart` already exists: merges only the fields present in `partial`.
 * - If not found: appends a new entry with missing fields defaulting to 0.
 * - Sorts result ascending by weekStart.
 * - Trims to WEEKLY_HISTORY_MAX entries (oldest removed).
 * - Does not mutate the input array.
 */
export function mergeWeeklySnapshot(
  history: WeeklySnapshot[],
  partial: Partial<WeeklySnapshot> & { weekStart: string },
): WeeklySnapshot[] {
  const idx = history.findIndex(s => s.weekStart === partial.weekStart);
  let updated: WeeklySnapshot[];

  if (idx >= 0) {
    // Merge: only overwrite fields present in partial
    updated = history.map((s, i) =>
      i === idx ? { ...s, ...partial } : s,
    );
  } else {
    // Append new entry with defaults for missing fields
    const entry: WeeklySnapshot = {
      weekStart: partial.weekStart,
      hours: partial.hours ?? 0,
      earnings: partial.earnings ?? 0,
      aiPct: partial.aiPct ?? 0,
      brainliftHours: partial.brainliftHours ?? 0,
    };
    updated = [...history, entry];
  }

  // Sort ascending, trim to max (slice(-N) keeps last N = most recent)
  return updated
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-WEEKLY_HISTORY_MAX);
}

// ─── loadWeeklyHistory ────────────────────────────────────────────────────────

/**
 * Reads WeeklySnapshot[] from AsyncStorage.
 * Returns [] on missing key, invalid JSON, non-array value, or any error.
 * Never throws.
 */
export async function loadWeeklyHistory(): Promise<WeeklySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WeeklySnapshot[];
  } catch {
    return [];
  }
}

// ─── saveWeeklyHistory ────────────────────────────────────────────────────────

/**
 * Writes WeeklySnapshot[] to AsyncStorage.
 * Propagates AsyncStorage errors — callers decide how to handle.
 */
export async function saveWeeklyHistory(snapshots: WeeklySnapshot[]): Promise<void> {
  await AsyncStorage.setItem(WEEKLY_HISTORY_KEY, JSON.stringify(snapshots));
}
