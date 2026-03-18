// FR1, FR2, FR3: Widget Data Bridge
// updateWidgetData — called by app after each data refresh
// buildTimelineEntries — generates iOS timeline entries with countdown accuracy
// readWidgetData — read by Android widget task handler
// Extended in 08-widget-enhancements: buildDailyEntries, formatApprovalItems, formatMyRequests

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUrgencyLevel } from '../lib/hours';
import type { HoursData, DailyEntry } from '../lib/hours';
import type { AIWeekData } from '../lib/ai';
import type { CrossoverConfig } from '../types/config';
import type { ApprovalItem } from '../lib/approvals';
import type { ManualRequestEntry } from '../types/requests';
import type { WidgetData, WidgetUrgency, WidgetDailyEntry, WidgetApprovalItem, WidgetMyRequest } from './types';

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

// ─── 08-widget-enhancements: data transformation helpers ─────────────────────

// Day names in Mon[0]–Sun[6] order
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Maps a YYYY-MM-DD date string to a Mon–Sun day index (Mon=0, Sun=6).
 * Uses T12:00:00 to avoid UTC midnight shifting in local timezone.
 */
function dateToDayIndex(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const jsDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6
}

/**
 * Builds exactly 7 WidgetDailyEntry values in Mon[0]–Sun[6] order
 * from HoursData.daily. Missing days are filled with hours: 0, isToday: false.
 *
 * Exported for unit testing.
 */
export function buildDailyEntries(daily: DailyEntry[]): WidgetDailyEntry[] {
  // Build a lookup: dayIndex → entry
  const byDayIndex: Record<number, DailyEntry> = {};
  for (const entry of daily) {
    const idx = dateToDayIndex(entry.date);
    byDayIndex[idx] = entry;
  }

  return DAY_LABELS.map((dayLabel, i) => {
    const entry = byDayIndex[i];
    if (!entry) {
      return { day: dayLabel, hours: 0, isToday: false };
    }
    return {
      day: dayLabel,
      hours: Math.round(entry.hours * 10) / 10,
      isToday: entry.isToday,
    };
  });
}

/**
 * Truncates a string to maxLen characters with an ellipsis if needed.
 * Uses a single Unicode ellipsis character (…) as the truncation marker.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Formats up to maxCount ApprovalItems into WidgetApprovalItem display records.
 * Names are truncated to 18 chars. Category is derived from item.category.
 *
 * Exported for unit testing.
 */
export function formatApprovalItems(
  items: ApprovalItem[],
  maxCount: number,
): WidgetApprovalItem[] {
  return items.slice(0, maxCount).map((item) => ({
    id: item.id,
    name: truncate(item.fullName, 18),
    hours: item.hours,
    category: item.category,
  }));
}

// Month abbreviations for date formatting
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/**
 * Formats a YYYY-MM-DD date string as "Ddd Mmm D" (e.g. "Tue Mar 18").
 */
function formatRequestDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_ABBR[d.getDay()]} ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Formats up to maxCount ManualRequestEntries into WidgetMyRequest display records.
 * Date is formatted as "Ddd Mmm D". Memo is truncated to 18 chars.
 *
 * Exported for unit testing.
 */
export function formatMyRequests(
  entries: ManualRequestEntry[],
  maxCount: number,
): WidgetMyRequest[] {
  return entries.slice(0, maxCount).map((entry) => ({
    id: entry.id,
    date: formatRequestDate(entry.date),
    hours: (entry.durationMinutes / 60).toFixed(1) + 'h',
    memo: truncate(entry.memo, 18),
    status: entry.status,
  }));
}

/**
 * Derives the actionBg tint color from role and item states.
 * Returns null in hours mode (no pending items).
 */
function deriveActionBg(
  isManager: boolean,
  approvalItems: ApprovalItem[],
  myRequests: ManualRequestEntry[],
): string | null {
  if (isManager) {
    return approvalItems.length > 0 ? '#1C1400' : null;
  }
  // Contributor: check request statuses
  const hasRejected = myRequests.some((r) => r.status === 'REJECTED');
  if (hasRejected) return '#1C0A0E';
  const hasPending = myRequests.some((r) => r.status === 'PENDING');
  if (hasPending) return '#120E1A';
  return null;
}

// ─── buildWidgetData ──────────────────────────────────────────────────────────

/**
 * Builds a WidgetData snapshot from app data sources.
 * Called internally by updateWidgetData.
 *
 * Extended in 08-widget-enhancements to accept approvalItems + myRequests
 * and produce daily, approvalItems, myRequests, actionBg fields.
 */
function buildWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  _pendingCount: number,
  config: CrossoverConfig,
  approvalItems: ApprovalItem[] = [],
  myRequests: ManualRequestEntry[] = [],
  now: number = Date.now()
): WidgetData {
  const deadlineMs = hoursData.deadline.getTime();
  const urgency: WidgetUrgency = getUrgencyLevel(deadlineMs - now);

  // pendingCount is derived from approvalItems, not the passed-in parameter
  const derivedPendingCount = config.isManager ? approvalItems.length : 0;

  // Format items for widget display
  const widgetApprovalItems = config.isManager ? formatApprovalItems(approvalItems, 3) : [];
  const widgetMyRequests = config.isManager ? [] : formatMyRequests(myRequests, 3);

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
    pendingCount: derivedPendingCount,
    isManager: config.isManager,
    cachedAt: now,
    useQA: config.useQA,
    // 08-widget-enhancements fields
    daily: buildDailyEntries(hoursData.daily),
    approvalItems: widgetApprovalItems,
    myRequests: widgetMyRequests,
    actionBg: deriveActionBg(config.isManager, approvalItems, myRequests),
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

// ─── iOS widget layout ────────────────────────────────────────────────────────
//
// Self-contained JS function string evaluated in the widget extension's JSContext.
// The JSContext loads ExpoWidgets.bundle first, which exposes SwiftUI helpers as
// globals: VStack, HStack, Text, Spacer, ZStack, and modifier functions:
// background(color), padding({all}), foregroundStyle(color), font({size, weight}).
//
// Rules for this string:
//   - No imports, no require() — use only globals
//   - No closed-over variables from the outer bundle scope
//   - Must be a function expression (wrapped in parens by createWidgetContext)
//
// The native WidgetObject stores this string in UserDefaults (App Group shared
// storage). The widget extension reads it, evaluates it, and calls the function
// with (props: WidgetData, env: { widgetFamily: string }) each render cycle.
//
const WIDGET_LAYOUT_JS = `(function(props, env) {
  // ── Brand palette ──────────────────────────────────────────────────────────
  var BG       = '#0D0C14';
  var GOLD     = '#E8C97A';   // earnings only
  var CYAN     = '#00C2FF';   // AI % only
  var VIOLET   = '#A78BFA';   // BrainLift only
  var WHITE    = '#FFFFFF';   // primary values
  var LABEL    = '#8B949E';   // secondary labels
  var MUTED    = '#484F58';   // subdued caps / sublabels

  // Hours colour tracks urgency state
  var HOURS_COLOR = {
    none:     '#10B981',
    low:      '#10B981',
    high:     '#F59E0B',
    critical: '#F43F5E',
    expired:  '#484F58'
  };
  var hoursColor = HOURS_COLOR[props.urgency] || HOURS_COLOR.none;

  // ── 08-widget-enhancements: action mode ────────────────────────────────────
  var hasApprovals = props.approvalItems && props.approvalItems.length > 0;
  var hasRequests  = props.myRequests && props.myRequests.length > 0;
  var actionMode   = hasApprovals || hasRequests;
  var bg           = props.actionBg || BG;

  // Badge colours for category / status labels
  var BADGE_COLORS = {
    MANUAL:   '#00C2FF',
    OVERTIME: '#A78BFA',
    PENDING:  '#F59E0B',
    APPROVED: '#10B981',
    REJECTED: '#F43F5E'
  };

  // Items to show in action mode (approvals for manager, requests for contributor)
  var actionItems = hasApprovals ? props.approvalItems : (props.myRequests || []);

  var family   = (env && env.widgetFamily) || 'systemMedium';
  var fill     = frame({ maxWidth: 9999, maxHeight: 9999 });

  // ── Shared: action-mode item row ───────────────────────────────────────────
  // Renders one approval or request row
  function buildItemRow(item) {
    var badgeKey = item.category || item.status || 'MANUAL';
    var badgeColor = BADGE_COLORS[badgeKey] || MUTED;
    return HStack({
      spacing: 6,
      children: [
        Text({
          modifiers: [foregroundStyle(WHITE), font({ size: 12 })],
          children: item.name || item.memo || ''
        }),
        Spacer({}),
        Text({
          modifiers: [foregroundStyle(hoursColor), font({ size: 12, weight: 'semibold' })],
          children: item.hours || ''
        }),
        Text({
          modifiers: [foregroundStyle(badgeColor), font({ size: 11 })],
          children: badgeKey
        })
      ]
    });
  }

  // ── systemSmall ────────────────────────────────────────────────────────────
  // No mode switch — small widget unchanged
  if (family === 'systemSmall') {
    return VStack({
      alignment: 'leading',
      spacing: 2,
      modifiers: [background(BG), padding({ all: 14 }), fill],
      children: [
        Text({
          modifiers: [foregroundStyle(hoursColor), font({ size: 36, weight: 'bold' })],
          children: props.hoursDisplay
        }),
        Text({
          modifiers: [foregroundStyle(MUTED), font({ size: 11 })],
          children: 'this week'
        }),
        Spacer({}),
        Text({
          modifiers: [foregroundStyle(GOLD), font({ size: 20, weight: 'semibold' })],
          children: props.earnings
        }),
        Text({
          modifiers: [foregroundStyle(LABEL), font({ size: 12 })],
          children: props.hoursRemaining
        })
      ]
    });
  }

  // ── systemLarge ────────────────────────────────────────────────────────────
  if (family === 'systemLarge') {
    // Action mode: compact hero + item list
    if (actionMode) {
      var largeItems = actionItems.slice(0, 4);
      var moreCount = (props.pendingCount || actionItems.length) - 4;
      var itemChildren = largeItems.map(function(item) { return buildItemRow(item); });
      if (moreCount > 0) {
        itemChildren.push(
          HStack({
            children: [
              Spacer({}),
              Text({
                modifiers: [foregroundStyle(MUTED), font({ size: 11 })],
                children: '+' + moreCount + ' more'
              })
            ]
          })
        );
      }
      return VStack({
        alignment: 'leading',
        spacing: 12,
        modifiers: [background(bg), padding({ all: 18 }), fill],
        children: [
          // Mini hero
          HStack({
            spacing: 6,
            children: [
              Text({
                modifiers: [foregroundStyle(hoursColor), font({ size: 18, weight: 'bold' })],
                children: props.hoursDisplay
              }),
              Text({
                modifiers: [foregroundStyle(MUTED), font({ size: 16 })],
                children: ' · '
              }),
              Text({
                modifiers: [foregroundStyle(GOLD), font({ size: 16, weight: 'semibold' })],
                children: props.earnings
              })
            ]
          })
        ].concat(itemChildren)
      });
    }

    // Hours mode: existing layout + bar chart
    var barChart = [];
    if (props.daily && props.daily.length > 0) {
      var maxHours = Math.max.apply(null, props.daily.map(function(d) { return d.hours; }).concat([8]));
      barChart = props.daily.map(function(entry) {
        var barWidth = Math.max(3, Math.round((entry.hours / maxHours) * 160));
        var barColor = entry.isToday ? hoursColor : '#2A2A3A';
        return HStack({
          spacing: 6,
          children: [
            Text({
              modifiers: [foregroundStyle(MUTED), font({ size: 12 }), frame({ width: 30 })],
              children: entry.day
            }),
            HStack({
              modifiers: [background(barColor), frame({ width: barWidth, height: 8 }), cornerRadius(3)],
              children: []
            }),
            Spacer({}),
            Text({
              modifiers: [foregroundStyle(LABEL), font({ size: 11 })],
              children: entry.hours.toFixed(1) + 'h'
            })
          ]
        });
      });
    }

    return VStack({
      alignment: 'leading',
      spacing: 20,
      modifiers: [background(bg), padding({ all: 18 }), fill],
      children: [
        HStack({
          children: [
            VStack({
              alignment: 'leading',
              spacing: 2,
              children: [
                Text({
                  modifiers: [foregroundStyle(hoursColor), font({ size: 42, weight: 'bold' })],
                  children: props.hoursDisplay
                }),
                Text({
                  modifiers: [foregroundStyle(MUTED), font({ size: 12 })],
                  children: 'this week'
                })
              ]
            }),
            Spacer({}),
            VStack({
              alignment: 'trailing',
              spacing: 2,
              children: [
                Text({
                  modifiers: [foregroundStyle(GOLD), font({ size: 30, weight: 'semibold' })],
                  children: props.earnings
                }),
                Text({
                  modifiers: [foregroundStyle(MUTED), font({ size: 12 })],
                  children: 'earned'
                })
              ]
            })
          ]
        }),
        VStack({
          alignment: 'leading',
          spacing: 14,
          children: [
            HStack({
              children: [
                Text({ modifiers: [foregroundStyle(LABEL), font({ size: 14 })], children: 'Today' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(WHITE), font({ size: 14, weight: 'semibold' })], children: props.today })
              ]
            }),
            HStack({
              children: [
                Text({ modifiers: [foregroundStyle(LABEL), font({ size: 14 })], children: 'Remaining' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(hoursColor), font({ size: 14, weight: 'semibold' })], children: props.hoursRemaining })
              ]
            }),
            HStack({
              children: [
                Text({ modifiers: [foregroundStyle(LABEL), font({ size: 14 })], children: 'AI usage' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(CYAN), font({ size: 14, weight: 'semibold' })], children: props.aiPct })
              ]
            }),
            HStack({
              children: [
                Text({ modifiers: [foregroundStyle(LABEL), font({ size: 14 })], children: 'BrainLift' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(VIOLET), font({ size: 14, weight: 'semibold' })], children: props.brainlift })
              ]
            })
          ]
        })
      ].concat(barChart)
    });
  }

  // ── systemMedium (default) ─────────────────────────────────────────────────
  // Action mode: compact hero + up to 2 item rows
  if (actionMode) {
    var medItems = actionItems.slice(0, 2);
    var medItemRows = medItems.map(function(item) { return buildItemRow(item); });
    return VStack({
      alignment: 'leading',
      spacing: 10,
      modifiers: [background(bg), padding({ all: 14 }), fill],
      children: [
        // Mini hero
        HStack({
          spacing: 6,
          children: [
            Text({
              modifiers: [foregroundStyle(hoursColor), font({ size: 16, weight: 'bold' })],
              children: props.hoursDisplay
            }),
            Text({
              modifiers: [foregroundStyle(MUTED), font({ size: 14 })],
              children: ' · '
            }),
            Text({
              modifiers: [foregroundStyle(GOLD), font({ size: 14, weight: 'semibold' })],
              children: props.earnings
            })
          ]
        })
      ].concat(medItemRows)
    });
  }

  // Hours mode (unchanged from 06-widgets)
  return VStack({
    alignment: 'leading',
    spacing: 10,
    modifiers: [background(BG), padding({ all: 14 }), fill],
    children: [
      HStack({
        children: [
          VStack({
            alignment: 'leading',
            spacing: 2,
            children: [
              Text({
                modifiers: [foregroundStyle(hoursColor), font({ size: 36, weight: 'bold' })],
                children: props.hoursDisplay
              }),
              Text({
                modifiers: [foregroundStyle(MUTED), font({ size: 11 })],
                children: 'this week'
              })
            ]
          }),
          Spacer({}),
          VStack({
            alignment: 'trailing',
            spacing: 2,
            children: [
              Text({
                modifiers: [foregroundStyle(GOLD), font({ size: 28, weight: 'semibold' })],
                children: props.earnings
              }),
              Text({
                modifiers: [foregroundStyle(MUTED), font({ size: 11 })],
                children: 'earned'
              })
            ]
          })
        ]
      }),
      HStack({
        children: [
          VStack({
            alignment: 'leading',
            spacing: 2,
            children: [
              Text({ modifiers: [foregroundStyle(MUTED), font({ size: 10 })], children: 'TODAY' }),
              Text({ modifiers: [foregroundStyle(WHITE), font({ size: 13, weight: 'semibold' })], children: props.today })
            ]
          }),
          Spacer({}),
          VStack({
            alignment: 'leading',
            spacing: 2,
            children: [
              Text({ modifiers: [foregroundStyle(MUTED), font({ size: 10 })], children: 'AI USAGE' }),
              Text({ modifiers: [foregroundStyle(CYAN), font({ size: 13, weight: 'semibold' })], children: props.aiPct })
            ]
          }),
          Spacer({}),
          VStack({
            alignment: 'trailing',
            spacing: 2,
            children: [
              Text({ modifiers: [foregroundStyle(MUTED), font({ size: 10 })], children: 'REMAINING' }),
              Text({ modifiers: [foregroundStyle(hoursColor), font({ size: 13, weight: 'semibold' })], children: props.hoursRemaining })
            ]
          })
        ]
      })
    ]
  });
})`;

// ─── FR1: updateWidgetData ────────────────────────────────────────────────────

/**
 * Primary update function — called by app after each data refresh.
 * - Builds WidgetData from app data sources
 * - Android: writes to AsyncStorage 'widget_data'
 * - iOS: stores layout + timeline entries in shared UserDefaults (App Group),
 *   then tells WidgetKit to reload the 'HourglassWidget' timeline.
 *
 * @param hoursData     - Weekly hours/earnings data from useHoursData hook
 * @param aiData        - AI% and BrainLift data from useAIData hook (null if unavailable)
 * @param pendingCount  - Pending approval count (0 for contributors) — legacy param, derived internally now
 * @param config        - App configuration including isManager and useQA
 * @param approvalItems - Manager's pending approval items (default [])
 * @param myRequests    - Contributor's manual time requests (default [])
 */
export async function updateWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig,
  approvalItems?: ApprovalItem[],
  myRequests?: ManualRequestEntry[]
): Promise<void> {
  const data = buildWidgetData(hoursData, aiData, pendingCount, config, approvalItems ?? [], myRequests ?? []);

  // Android: write snapshot to AsyncStorage for task handler to read
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

  // iOS: store layout string + timeline entries in App Group UserDefaults,
  // then signal WidgetKit to reload.
  if (Platform.OS === 'ios') {
    try {
      // expo-widgets is iOS-only; import dynamically to avoid crash on Android.
      // The native Widget constructor accepts a layout as String (not Function).
      // Passing WIDGET_LAYOUT_JS (a string) bypasses the TypeScript function
      // signature but matches what the Swift constructor expects: String.
      // The string is evaluated in the widget extension's JSContext each render.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createWidget } = require('expo-widgets');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const widget = createWidget('HourglassWidget', WIDGET_LAYOUT_JS as any);
      const entries = buildTimelineEntries(data, 60, 15);
      widget.updateTimeline(entries);
      console.log('[bridge] widget timeline updated,', entries.length, 'entries, urgency:', data.urgency);
    } catch (err) {
      console.error('[bridge] iOS widget update failed:', err);
    }
  }
}
