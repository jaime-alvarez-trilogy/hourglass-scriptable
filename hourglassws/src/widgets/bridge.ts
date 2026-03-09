// FR1, FR2, FR3: Widget Data Bridge
// updateWidgetData — called by app after each data refresh
// buildTimelineEntries — generates iOS timeline entries with countdown accuracy
// readWidgetData — read by Android widget task handler

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUrgencyLevel } from '../lib/hours';
import type { HoursData } from '../lib/hours';
import type { AIWeekData } from '../lib/ai';
import type { CrossoverConfig } from '../types/config';
import type { WidgetData, WidgetUrgency } from './types';

const WIDGET_DATA_KEY = 'widget_data';
// Stale threshold: 2 hours in ms
export const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format a number as USD currency string: $1,300 or $800
 */
function formatEarnings(amount: number): string {
  const rounded = Math.round(amount);
  return '$' + rounded.toLocaleString('en-US');
}

/**
 * Compute hoursRemaining display string from HoursData.
 */
function formatHoursRemaining(hoursRemaining: number, overtimeHours: number): string {
  if (overtimeHours > 0) {
    return `${overtimeHours.toFixed(1)}h OT`;
  }
  return `${hoursRemaining.toFixed(1)}h left`;
}

/**
 * Compute AI% range string: "71%–75%" (en-dash) or "N/A"
 */
function formatAIPct(aiData: AIWeekData | null): string {
  if (!aiData) return 'N/A';
  return `${aiData.aiPctLow}%\u2013${aiData.aiPctHigh}%`;
}

// ─── buildWidgetData ──────────────────────────────────────────────────────────

/**
 * Builds a WidgetData snapshot from app data sources.
 * Called internally by updateWidgetData.
 */
function buildWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig,
  now: number = Date.now()
): WidgetData {
  const deadlineMs = hoursData.deadline.getTime();
  const urgency: WidgetUrgency = getUrgencyLevel(deadlineMs - now);

  return {
    hours: hoursData.total.toFixed(1),
    hoursDisplay: `${hoursData.total.toFixed(1)}h`,
    earnings: formatEarnings(hoursData.weeklyEarnings),
    earningsRaw: hoursData.weeklyEarnings,
    today: `${hoursData.today.toFixed(1)}h`,
    hoursRemaining: formatHoursRemaining(hoursData.hoursRemaining, hoursData.overtimeHours),
    aiPct: formatAIPct(aiData),
    brainlift: aiData ? `${aiData.brainliftHours.toFixed(1)}h` : '0.0h',
    deadline: deadlineMs,
    urgency,
    pendingCount: config.isManager ? pendingCount : 0,
    isManager: config.isManager,
    cachedAt: now,
    useQA: config.useQA,
  };
}

// ─── FR2: buildTimelineEntries ────────────────────────────────────────────────

/**
 * Generates an array of timeline entries for iOS WidgetKit.
 * Each entry is {date, props} where props is a copy of baseData with
 * urgency recomputed for that entry's date vs deadline.
 *
 * @param baseData  - Current WidgetData snapshot
 * @param count     - Number of entries to generate (default 60)
 * @param intervalMinutes - Minutes between entries (default 15)
 */
export function buildTimelineEntries(
  baseData: WidgetData,
  count: number = 60,
  intervalMinutes: number = 15
): Array<{ date: Date; props: WidgetData }> {
  const intervalMs = intervalMinutes * 60 * 1000;
  const startTime = Date.now();
  const entries: Array<{ date: Date; props: WidgetData }> = [];

  for (let i = 0; i < count; i++) {
    const entryTimeMs = startTime + i * intervalMs;
    const entryDate = new Date(entryTimeMs);
    const urgency: WidgetUrgency = getUrgencyLevel(baseData.deadline - entryTimeMs);

    // Recompute hoursRemaining display for entries past deadline
    const hoursRemaining =
      urgency === 'expired' ? '0h left' : baseData.hoursRemaining;

    entries.push({
      date: entryDate,
      props: {
        ...baseData,
        urgency,
        hoursRemaining,
      },
    });
  }

  return entries;
}

// ─── FR3: readWidgetData ──────────────────────────────────────────────────────

/**
 * Reads WidgetData from AsyncStorage.
 * Used by Android widget task handler.
 * Returns null if key absent, JSON malformed, or AsyncStorage throws.
 */
export async function readWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetData;
  } catch {
    return null;
  }
}

// ─── FR1: updateWidgetData ────────────────────────────────────────────────────

/**
 * Primary update function — called by app after each data refresh.
 * - Builds WidgetData from app data sources
 * - Android: writes to AsyncStorage 'widget_data'
 * - iOS: generates 60 timeline entries and calls HourglassWidget.updateTimeline()
 *
 * @param hoursData    - Weekly hours/earnings data from useHoursData hook
 * @param aiData       - AI% and BrainLift data from useAIData hook (null if unavailable)
 * @param pendingCount - Pending approval count (0 for contributors)
 * @param config       - App configuration including isManager and useQA
 */
export async function updateWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig
): Promise<void> {
  const data = buildWidgetData(hoursData, aiData, pendingCount, config);

  // Android: write snapshot to AsyncStorage for task handler to read
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

  // iOS: generate timeline and update WidgetKit
  if (Platform.OS === 'ios') {
    try {
      // expo-widgets is iOS-only; import dynamically to avoid crash on Android
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoWidgets = require('expo-widgets');
      const HourglassWidget = ExpoWidgets.HourglassWidget;
      if (HourglassWidget?.updateTimeline) {
        const entries = buildTimelineEntries(data, 60, 15);
        const timelineEntries = entries.map((e) => ({
          date: e.date,
          props: e.props,
        }));
        await HourglassWidget.updateTimeline(timelineEntries);
      }
    } catch {
      // iOS widget update failure is non-critical; data is in AsyncStorage as fallback
    }
  }
}
