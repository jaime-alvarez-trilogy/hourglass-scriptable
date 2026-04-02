// FR1, FR2, FR3: Widget Data Bridge
// updateWidgetData — called by app after each data refresh
// buildTimelineEntries — generates iOS timeline entries with countdown accuracy
// readWidgetData — read by Android widget task handler
// Extended in 08-widget-enhancements: buildDailyEntries, formatApprovalItems, formatMyRequests

import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
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
 * Returns midnight (00:00:00.000) of the given date in local time.
 */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Returns the Monday of the ISO week containing `d` (local time midnight).
 */
function getWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysFromMonday);
  return monday;
}

/**
 * Builds exactly 7 WidgetDailyEntry values in Mon[0]–Sun[6] order
 * from HoursData.daily. Missing days are filled with hours: 0, isToday: false.
 *
 * @param daily - Source daily entries from HoursData.
 * @param now   - Current date for isFuture computation (defaults to new Date()).
 *                Accepts an optional value for testability.
 *
 * Exported for unit testing.
 */
export function buildDailyEntries(daily: DailyEntry[], now: Date = new Date()): WidgetDailyEntry[] {
  const todayStart = startOfDay(now);
  const weekMonday = getWeekMonday(now);

  // Build a lookup: dayIndex → entry
  const byDayIndex: Record<number, DailyEntry> = {};
  for (const entry of daily) {
    const idx = dateToDayIndex(entry.date);
    byDayIndex[idx] = entry;
  }

  return DAY_LABELS.map((dayLabel, i) => {
    const entry = byDayIndex[i];
    if (!entry) {
      // Gap-filled: derive the reconstructed date from week Monday + day index
      const reconstructedDate = new Date(
        weekMonday.getFullYear(),
        weekMonday.getMonth(),
        weekMonday.getDate() + i,
      );
      return {
        day: dayLabel,
        hours: 0,
        isToday: false,
        isFuture: reconstructedDate > todayStart,
      };
    }
    return {
      day: dayLabel,
      hours: Math.round(entry.hours * 10) / 10,
      isToday: entry.isToday,
      isFuture: startOfDay(new Date(entry.date + 'T12:00:00')) > todayStart,
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
  return entries
    .filter((entry) => entry.status === 'PENDING' || entry.status === 'REJECTED')
    .slice(0, maxCount).map((entry) => ({
    id: entry.id,
    date: formatRequestDate(entry.date),
    hours: (entry.durationMinutes / 60).toFixed(1) + 'h',
    memo: truncate(entry.memo, 18),
    status: entry.status,
  }));
}

/**
 * Derives the actionBg tint color from role and item states.
 * Returns "" in hours mode (no pending items) — never null, as null serializes
 * to NSNull which UserDefaults rejects as a non-plist type.
 */
function deriveActionBg(
  isManager: boolean,
  approvalItems: ApprovalItem[],
  myRequests: ManualRequestEntry[],
): string {
  if (isManager) {
    return approvalItems.length > 0 ? '#1C1400' : '';
  }
  // Contributor: check request statuses
  const hasRejected = myRequests.some((r) => r.status === 'REJECTED');
  if (hasRejected) return '#1C0A0E';
  const hasPending = myRequests.some((r) => r.status === 'PENDING');
  if (hasPending) return '#120E1A';
  return '';
}

// ─── 01-data-extensions: pace badge + week delta computation ─────────────────

/**
 * Computes the paceBadge value from hoursData and config.
 * Returns 'none' if hoursData is null or expectedHours is 0 (Monday).
 * Returns 'crushed_it' if in overtime.
 * Otherwise compares total vs expected using workdays elapsed Mon–Fri.
 */
function computePaceBadge(
  hoursData: HoursData | null,
  config: CrossoverConfig,
): 'crushed_it' | 'on_track' | 'behind' | 'critical' | 'none' {
  if (!hoursData) return 'none';
  if (hoursData.overtimeHours > 0) return 'crushed_it';

  const day = new Date().getDay(); // 0=Sun, 1=Mon..6=Sat
  // Elapsed workdays: Mon(1)→0, Tue(2)→1, Wed(3)→2, Thu(4)→3, Fri(5)→4, Sat(6)→5, Sun(0)→5
  const workdaysElapsed = (day === 0 || day === 6) ? 5 : Math.min(day - 1, 5);
  const weeklyLimit = config.weeklyLimit ?? 40;
  const expectedHours = weeklyLimit * (workdaysElapsed / 5);

  if (expectedHours === 0) return 'none';

  const ratio = hoursData.total / expectedHours;
  if (ratio >= 0.9) return 'on_track';
  if (ratio >= 0.7) return 'behind';
  return 'critical';
}

/**
 * Computes weekDeltaHours and weekDeltaEarnings formatted strings.
 * Returns empty strings when hoursData or prevWeekSnapshot is missing.
 */
function computeWeekDeltas(
  hoursData: HoursData | null,
  prevWeekSnapshot: { hours: number; earnings: number } | null | undefined,
): { weekDeltaHours: string; weekDeltaEarnings: string } {
  if (!hoursData || !prevWeekSnapshot) {
    return { weekDeltaHours: '', weekDeltaEarnings: '' };
  }
  const dh = hoursData.total - prevWeekSnapshot.hours;
  const de = hoursData.weeklyEarnings - prevWeekSnapshot.earnings;
  const weekDeltaHours = (dh >= 0 ? '+' : '') + dh.toFixed(1) + 'h';
  const weekDeltaEarnings = de >= 0
    ? '+$' + Math.round(de).toLocaleString()
    : '-$' + Math.abs(Math.round(de)).toLocaleString();
  return { weekDeltaHours, weekDeltaEarnings };
}

/**
 * Computes today's hours vs daily average as a signed delta string.
 * Returns "" when average === 0 (e.g. Monday, no baseline yet).
 * Exported for direct unit testing.
 *
 * @param today   - HoursData.today (hours worked today, raw number)
 * @param average - HoursData.average (average daily hours this week, raw number)
 * @returns "+1.2h" | "-0.5h" | "+0.0h" | ""
 */
export function computeTodayDelta(today: number, average: number): string {
  if (average === 0) return '';
  const delta = today - average;
  const abs = Math.abs(delta).toFixed(1);
  return delta >= 0 ? `+${abs}h` : `-${abs}h`;
}

// ─── buildWidgetData ──────────────────────────────────────────────────────────

/**
 * Builds a WidgetData snapshot from app data sources.
 * Called internally by updateWidgetData.
 *
 * Extended in 08-widget-enhancements to accept approvalItems + myRequests
 * and produce daily, approvalItems, myRequests, actionBg fields.
 *
 * Extended in 01-data-extensions: accepts HoursData | null and optional
 * prevWeekSnapshot; produces paceBadge, weekDeltaHours, weekDeltaEarnings,
 * brainliftTarget fields.
 */
function buildWidgetData(
  hoursData: HoursData | null,
  aiData: AIWeekData | null,
  _pendingCount: number,
  config: CrossoverConfig,
  approvalItems: ApprovalItem[] = [],
  myRequests: ManualRequestEntry[] = [],
  now: number = Date.now(),
  prevWeekSnapshot?: { hours: number; earnings: number } | null,
): WidgetData {
  // 01-data-extensions: compute new fields (work with null hoursData)
  const paceBadge = computePaceBadge(hoursData, config);
  const { weekDeltaHours, weekDeltaEarnings } = computeWeekDeltas(hoursData, prevWeekSnapshot);

  // Guard: hoursData required for deadline-dependent fields
  if (!hoursData) {
    return {
      hours: '0.0',
      hoursDisplay: '0.0h',
      earnings: '$0',
      earningsRaw: 0,
      today: '0.0h',
      hoursRemaining: '0.0h left',
      aiPct: formatAIPct(aiData),
      brainlift: aiData ? `${aiData.brainliftHours.toFixed(1)}h` : '0.0h',
      deadline: now,
      urgency: 'none',
      pendingCount: 0,
      isManager: config.isManager,
      cachedAt: now,
      useQA: config.useQA,
      daily: [],
      approvalItems: [],
      myRequests: [],
      actionBg: '',
      paceBadge,
      weekDeltaHours,
      weekDeltaEarnings,
      brainliftTarget: '5h',
      todayDelta: '',
    };
  }

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
    // 01-data-extensions fields
    paceBadge,
    weekDeltaHours,
    weekDeltaEarnings,
    brainliftTarget: '5h',
    // 01-widget-polish fields
    todayDelta: computeTodayDelta(hoursData.today, hoursData.average),
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
// globals: VStack, HStack, Text, Spacer, ZStack, Circle, RoundedRectangle, Capsule,
// LinearGradient, ContainerBackground, and modifier functions:
// foregroundStyle(color), font({size,weight}), frame({width?,height?}),
// padding({all}), background(color), opacity(val).
//
// Rules for this string:
//   - No imports, no require() — use only globals
//   - No closed-over variables from the outer bundle scope
//   - Must be a function expression (wrapped in parens by createWidgetContext)
//   - ES5 only: var, function declarations, no arrow functions, no const/let
//
// The native WidgetObject stores this string in UserDefaults (App Group shared
// storage). The widget extension reads it, evaluates it, and calls the function
// with (props: WidgetData, env: { widgetFamily: string }) each render cycle.
//
// 02-ios-visual: Full brand redesign — mesh bg simulation, glass panels,
// pace badge, week delta text, brainliftTarget-driven progress bars.
//
const WIDGET_LAYOUT_JS = `(function(props, env) {
  // ── 1. Color palette ────────────────────────────────────────────────────────
  var BG_DARK    = '#0B0D13';
  var GLASS      = '#1C1E26';     // glass card fill base
  var GOLD       = '#E8C97A';     // earnings
  var CYAN       = '#00C2FF';     // AI %
  var VIOLET     = '#A78BFA';     // BrainLift
  var TEXT_PRI   = '#E0E0E0';
  var TEXT_SEC   = '#94A3B8';     // secondary labels (blue-gray)
  var TEXT_MUTED = '#757575';

  // Urgency accent colors (used for hero numbers and glow)
  var URGENCY_ACCENT = {
    none:     '#00FF88',
    low:      '#F5C842',
    high:     '#FF6B00',
    critical: '#FF2D55',
    expired:  '#6B6B6B'
  };

  // Urgency tints for Small/Medium background overlay (~12% opacity, 8-char hex)
  var URGENCY_TINTS = {
    none:     '#0D0C1433',
    low:      '#F5C84220',
    high:     '#FF6B0020',
    critical: '#FF2D5520',
    expired:  '#6B6B6B20'
  };

  var PACE_LABELS = {
    crushed_it: 'CRUSHED IT',
    on_track:   'ON TRACK',
    behind:     'BEHIND PACE',
    critical:   'CRITICAL'
  };

  var BADGE_COLORS = {
    MANUAL:   '#00C2FF',
    OVERTIME: '#A78BFA',
    PENDING:  '#F59E0B',
    APPROVED: '#10B981',
    REJECTED: '#F43F5E'
  };

  // ── 2. Derived state ────────────────────────────────────────────────────────
  var urg      = props.urgency || 'none';
  var accent   = URGENCY_ACCENT[urg] || URGENCY_ACCENT.none;
  var tint     = URGENCY_TINTS[urg]  || URGENCY_TINTS.none;
  var pg       = props.paceBadge;
  var family   = (env && env.widgetFamily) || 'systemMedium';
  var fillFrame = frame({ maxWidth: 9999, maxHeight: 9999 });

  var hasApprovals = props.approvalItems && props.approvalItems.length > 0;
  var hasRequests  = props.myRequests && props.myRequests.length > 0;
  var actionMode   = hasApprovals || hasRequests;
  var actionItems  = hasApprovals ? props.approvalItems : (props.myRequests || []);

  // P1/P2/P3 priority
  var priority = 'default';
  if (props.isManager && props.pendingCount > 0) { priority = 'approvals'; }
  else if (pg === 'behind' || pg === 'critical') { priority = 'deficit'; }

  // ── 3. buildBg(urgency) — dark base + urgency circle glow (top-right) ──────
  // Used by Large widget. Small/Medium use two Rectangle layers.
  function buildBg(urgency) {
    var glowColor = URGENCY_ACCENT[urgency] || URGENCY_ACCENT.none;
    return ZStack({
      children: [
        Rectangle({ modifiers: [foregroundStyle(BG_DARK), fillFrame] }),
        VStack({
          modifiers: [fillFrame],
          children: [
            HStack({
              children: [
                Spacer({}),
                Circle({ modifiers: [foregroundStyle(glowColor), opacity(0.12),
                  frame({ width: 120, height: 120 })] })
              ]
            }),
            Spacer({})
          ]
        })
      ]
    });
  }

  // ── 4. buildGlassCard(children) — dark glass panel with subtle border ───────
  function buildGlassCard(children) {
    return ZStack({
      alignment: 'leading',
      children: [
        RoundedRectangle({ cornerRadius: 16, modifiers: [foregroundStyle(GLASS), opacity(0.80)] }),
        RoundedRectangle({ cornerRadius: 16, modifiers: [foregroundStyle('#FFFFFF'), opacity(0.06), frame({ maxWidth: 9999, maxHeight: 9999 })] }),
        VStack({ alignment: 'leading', spacing: 2, modifiers: [padding({ all: 14 })], children: children })
      ]
    });
  }

  // ── 5. buildItemRow(item) — action-mode glass row ───────────────────────────
  function buildItemRow(item) {
    var badgeKey = item.category || item.status || 'MANUAL';
    var badgeColor = BADGE_COLORS[badgeKey] || TEXT_MUTED;
    return buildGlassCard([
      HStack({
        spacing: 6,
        children: [
          Text({ modifiers: [foregroundStyle(TEXT_PRI), font({ size: 12 })],
            children: item.name || item.memo || '' }),
          Spacer({}),
          Text({ modifiers: [foregroundStyle(accent), font({ size: 12, weight: 'semibold' })],
            children: item.hours || '' }),
          Text({ modifiers: [foregroundStyle(badgeColor), font({ size: 11 })],
            children: badgeKey })
        ]
      })
    ]);
  }

  // ── 6. buildVerticalBarChart(daily, accentColor) — Mon–Sun column chart ─────
  function buildVerticalBarChart(daily, accentColor) {
    if (!daily || daily.length === 0) { return Spacer({}); }
    var maxH = 0;
    for (var i = 0; i < daily.length; i++) {
      if (daily[i].hours > maxH) { maxH = daily[i].hours; }
    }
    if (maxH === 0) { return Spacer({}); }
    var MAX_BAR = 80;
    var barItems = daily.map(function(entry) {
      var barH = Math.max(2, Math.round((entry.hours / maxH) * MAX_BAR));
      var barColor = entry.isToday ? accentColor
        : (entry.isFuture || entry.hours === 0 ? '#2F2E41' : '#4A4A6A');
      return VStack({
        spacing: 2,
        children: [
          Spacer({}),
          RoundedRectangle({ cornerRadius: 3,
            modifiers: [foregroundStyle(barColor), frame({ height: barH })] }),
          Text({ modifiers: [foregroundStyle('#777777'), font({ size: 10 })],
            children: entry.day })
        ]
      });
    });
    return HStack({ spacing: 4, children: barItems });
  }

  // ── 7. buildSmall(p) — hours hero + pace badge only ─────────────────────────
  // Small (150×150): only total hours + pace status. No earnings, no remaining.
  function buildSmall(p) {
    var badgeLabel = PACE_LABELS[pg] || '';
    var smallChildren = [
      Text({ modifiers: [foregroundStyle(accent), font({ size: 28, weight: 'heavy', design: 'monospaced' })],
        children: p.hoursDisplay }),
      Spacer({})
    ];
    if (badgeLabel) {
      smallChildren.push(Text({ modifiers: [foregroundStyle(accent), font({ size: 12 })],
        children: badgeLabel }));
    }
    if (p.isManager && p.pendingCount > 0) {
      smallChildren.push(Text({ modifiers: [foregroundStyle('#FF3B30'), font({ size: 11 })],
        children: p.pendingCount + ' pending' }));
    }
    return ZStack({
      children: [
        Rectangle({ modifiers: [foregroundStyle('#0D0C14'), fillFrame] }),
        Rectangle({ modifiers: [foregroundStyle(tint), fillFrame] }),
        VStack({ alignment: 'leading', spacing: 4,
          modifiers: [padding({ all: 12 }), fillFrame],
          children: smallChildren })
      ]
    });
  }

  // ── 8. buildMedium(p) ───────────────────────────────────────────────────────
  // P1: Approvals layout
  // P2: Deficit layout (hours + remaining + delta)
  // P3: Two glass cards (hours + earnings) + today/AI footer
  function buildMedium(p) {
    // P1: Approvals
    if (priority === 'approvals') {
      var approvalItems = (p.approvalItems || []).slice(0, 2);
      return ZStack({
        children: [
          Rectangle({ modifiers: [foregroundStyle('#0D0C14'), fillFrame] }),
          Rectangle({ modifiers: [foregroundStyle('#FF6B0020'), fillFrame] }),
          VStack({
            alignment: 'leading', spacing: 6,
            modifiers: [padding({ all: 12 }), fillFrame],
            children: [
              Text({ modifiers: [foregroundStyle(accent), font({ size: 13, weight: 'semibold' })],
                children: 'PENDING APPROVALS' }),
              Text({ modifiers: [foregroundStyle('#DDDDDD'), font({ size: 12 })],
                children: p.pendingCount + ' items requiring action' })
            ].concat(approvalItems.map(function(item) {
              return HStack({ children: [
                Text({ modifiers: [foregroundStyle('#FFFFFF'), font({ size: 12 })],
                  children: item.name || '' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle('#AAAAAA'), font({ size: 11 })],
                  children: item.hours || '' }),
                Text({ modifiers: [foregroundStyle(accent), font({ size: 10 })],
                  children: ' ' + (item.category || '') })
              ]});
            }))
          })
        ]
      });
    }

    // P2: Deficit
    if (priority === 'deficit') {
      var deltaEarnings = p.weekDeltaEarnings || '';
      return ZStack({
        children: [
          Rectangle({ modifiers: [foregroundStyle('#0D0C14'), fillFrame] }),
          Rectangle({ modifiers: [foregroundStyle(tint), fillFrame] }),
          VStack({
            alignment: 'leading', spacing: 8,
            modifiers: [padding({ all: 12 }), fillFrame],
            children: [
              Text({ modifiers: [foregroundStyle('#FF3B30'), font({ size: 13, weight: 'semibold' })],
                children: PACE_LABELS[pg] || pg }),
              Text({ modifiers: [foregroundStyle(accent), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle('#AAAAAA'), font({ size: 12 })],
                children: p.hoursRemaining }),
              Spacer({}),
              HStack({ children: [
                Text({ modifiers: [foregroundStyle('#DDDDDD'), font({ size: 13 })],
                  children: p.todayDelta || p.today || '' }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle('#DDDDDD'), font({ size: 13 })],
                  children: deltaEarnings })
              ]})
            ]
          })
        ]
      });
    }

    // P3: Default — dual glass cards + footer
    var hoursCard = buildGlassCard([
      Text({ modifiers: [foregroundStyle(accent), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
        children: p.hoursDisplay }),
      Text({ modifiers: [foregroundStyle('#AAAAAA'), font({ size: 12 })], children: 'this week' })
    ]);
    var earningsCard = buildGlassCard([
      Text({ modifiers: [foregroundStyle('#FFFFFF'), font({ size: 24, weight: 'semibold' })],
        children: p.earnings }),
      Text({ modifiers: [foregroundStyle('#AAAAAA'), font({ size: 12 })], children: 'earned' })
    ]);
    return ZStack({
      children: [
        Rectangle({ modifiers: [foregroundStyle('#0D0C14'), fillFrame] }),
        Rectangle({ modifiers: [foregroundStyle(tint), fillFrame] }),
        VStack({
          alignment: 'leading', spacing: 10,
          modifiers: [padding({ all: 12 }), fillFrame],
          children: [
            HStack({ spacing: 8, children: [hoursCard, earningsCard] }),
            Spacer({}),
            HStack({ children: [
              Text({ modifiers: [foregroundStyle('#DDDDDD'), font({ size: 13 })],
                children: 'Today: ' + (p.todayDelta || p.today || '') }),
              Spacer({}),
              Text({ modifiers: [foregroundStyle('#DDDDDD'), font({ size: 13 })],
                children: 'AI: ' + (p.aiPct || 'N/A') })
            ]})
          ]
        })
      ]
    });
  }

  // ── 9. buildLarge(p) ────────────────────────────────────────────────────────
  // P1/action: items list
  // P2: deficit view with bar chart
  // P3: header cards + status pill + ACTIVITY vertical bar chart + footer
  function buildLarge(p) {
    // P1/action mode: list of approval or request items
    if (actionMode) {
      var lgItems = actionItems.slice(0, 4);
      var moreCount = (p.pendingCount || actionItems.length) - 4;
      var lgRows = lgItems.map(function(item) { return buildItemRow(item); });
      if (moreCount > 0) {
        lgRows.push(HStack({ children: [Spacer({}),
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })],
            children: '+' + moreCount + ' more' })
        ]}));
      }
      return ZStack({
        children: [
          buildBg(urg),
          VStack({ alignment: 'leading', spacing: 12,
            modifiers: [padding({ top: 16, leading: 16, trailing: 16, bottom: 28 }), fillFrame],
            children: [HStack({ spacing: 6, children: [
              Text({ modifiers: [foregroundStyle(accent), font({ size: 18, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 16 })], children: ' · ' }),
              Text({ modifiers: [foregroundStyle(GOLD), font({ size: 16, weight: 'semibold' })],
                children: p.earnings })
            ]})].concat(lgRows) })
        ]
      });
    }

    // P2: Deficit with chart
    if (priority === 'deficit') {
      return ZStack({
        children: [
          buildBg(urg),
          VStack({ alignment: 'leading', spacing: 8,
            modifiers: [padding({ top: 16, leading: 16, trailing: 16, bottom: 28 }), fillFrame],
            children: [
              Text({ modifiers: [foregroundStyle(accent), font({ size: 13, weight: 'semibold' })],
                children: '\u26A0 ' + (PACE_LABELS[pg] || pg) }),
              Text({ modifiers: [foregroundStyle(accent), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 13 })],
                children: p.hoursRemaining }),
              Spacer({}),
              buildVerticalBarChart(p.daily, accent),
              Spacer({}),
              Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 11 })],
                children: 'Today: ' + (p.todayDelta || p.today || '') + ' \u2022 AI: ' + (p.aiPct || 'N/A') })
            ]
          })
        ]
      });
    }

    // P3: Default — header cards + status pill + bar chart + footer
    var paceLabel = PACE_LABELS[pg] || '';

    var hoursCard = buildGlassCard([
      Text({ modifiers: [foregroundStyle(accent), font({ size: 32, weight: 'bold' })],
        children: p.hoursDisplay }),
      Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 11, weight: 'medium' })],
        children: 'THIS WEEK' })
    ]);
    var earningsCard = buildGlassCard([
      Text({ modifiers: [foregroundStyle('#FFFFFF'), font({ size: 24, weight: 'bold' })],
        children: p.earnings }),
      Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 11, weight: 'medium' })],
        children: 'EARNED' })
    ]);

    // Status pill row
    var statusPillBg = RoundedRectangle({ cornerRadius: 12,
      modifiers: [foregroundStyle(accent), opacity(0.13), frame({ height: 24 })] });
    var statusPillTxt = Text({ modifiers: [foregroundStyle(accent),
      font({ size: 10, weight: 'heavy' }), padding({ leading: 8, trailing: 8 })],
      children: paceLabel });
    var statusPill = paceLabel
      ? ZStack({ children: [statusPillBg, statusPillTxt] })
      : Spacer({ minLength: 0 });

    var statusRow = HStack({ children: [
      statusPill,
      Spacer({}),
      Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 12 })],
        children: p.hoursRemaining })
    ]});

    var footerText = 'Today: ' + (p.todayDelta || p.today || '') + ' \u2022 AI: ' + (p.aiPct || 'N/A');

    return ZStack({
      children: [
        buildBg(urg),
        VStack({
          alignment: 'leading', spacing: 12,
          modifiers: [padding({ top: 16, leading: 16, trailing: 16, bottom: 28 }), fillFrame],
          children: [
            HStack({ spacing: 10, children: [hoursCard, earningsCard] }),
            statusRow,
            VStack({ alignment: 'leading', spacing: 8, children: [
              Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 11, weight: 'bold' })],
                children: 'ACTIVITY' }),
              buildVerticalBarChart(p.daily, accent)
            ]}),
            Spacer({}),
            Text({ modifiers: [foregroundStyle(TEXT_SEC), font({ size: 11 })],
              children: footerText })
          ]
        })
      ]
    });
  }

  // ── 10. buildAccessory(p, fam) — lock screen widgets ───────────────────────
  function buildAccessory(p, fam) {
    if (fam === 'accessoryCircular') {
      return VStack({ alignment: 'center', spacing: 0, children: [
        Text({ modifiers: [foregroundStyle(accent), font({ size: 18, weight: 'bold' })],
          children: p.hours || '0.0' }),
        Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'h' })
      ]});
    }
    if (fam === 'accessoryInline') {
      return Text({ modifiers: [foregroundStyle(accent)],
        children: (p.hoursDisplay || '0h') + ' \u00B7 ' + (p.earnings || '$0') + ' \u00B7 AI ' + (p.aiPct || 'N/A') });
    }
    // accessoryRectangular (default)
    return HStack({ spacing: 4, children: [
      Text({ modifiers: [foregroundStyle(accent), font({ size: 13, weight: 'bold' })],
        children: p.hoursDisplay || '0h' }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: '\u00B7' }),
      Text({ modifiers: [foregroundStyle(GOLD), font({ size: 13, weight: 'semibold' })],
        children: p.earnings || '$0' }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: '\u00B7' }),
      Text({ modifiers: [foregroundStyle(CYAN), font({ size: 11 })],
        children: 'AI ' + (p.aiPct || 'N/A') })
    ]});
  }

  // ── 11. Router ──────────────────────────────────────────────────────────────
  if (family === 'systemSmall') { return buildSmall(props); }
  if (family === 'systemLarge') { return buildLarge(props); }
  if (family === 'accessoryRectangular' ||
      family === 'accessoryCircular' ||
      family === 'accessoryInline') {
    return buildAccessory(props, family);
  }
  return buildMedium(props);
})`;

// ─── FR1: updateWidgetData ────────────────────────────────────────────────────

/**
 * Primary update function — called by app after each data refresh.
 * - Builds WidgetData from app data sources
 * - Android: writes to AsyncStorage 'widget_data'
 * - iOS: stores layout + timeline entries in shared UserDefaults (App Group),
 *   then tells WidgetKit to reload the 'HourglassWidget' timeline.
 *
 * @param hoursData         - Weekly hours/earnings data from useHoursData hook (null if still loading)
 * @param aiData            - AI% and BrainLift data from useAIData hook (null if unavailable)
 * @param pendingCount      - Pending approval count (0 for contributors) — legacy param, derived internally now
 * @param config            - App configuration including isManager and useQA
 * @param approvalItems     - Manager's pending approval items (default [])
 * @param myRequests        - Contributor's manual time requests (default [])
 * @param prevWeekSnapshot  - Previous week's hours+earnings for delta computation (omitted on background path)
 */
export async function updateWidgetData(
  hoursData: HoursData | null,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig,
  approvalItems?: ApprovalItem[],
  myRequests?: ManualRequestEntry[],
  prevWeekSnapshot?: { hours: number; earnings: number } | null,
): Promise<void> {
  const data = buildWidgetData(hoursData, aiData, pendingCount, config, approvalItems ?? [], myRequests ?? [], Date.now(), prevWeekSnapshot);

  // Android: write snapshot to AsyncStorage for task handler to read
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

  // iOS: store layout string + timeline entries in App Group UserDefaults,
  // then signal WidgetKit to reload.
  if (Platform.OS === 'ios') {
    // Guard: check if the native module is available before requiring expo-widgets.
    // requireOptionalNativeModule returns null if the module isn't compiled in
    // (New Architecture / TurboModules safe — NativeModules registry is old-arch only).
    if (!requireOptionalNativeModule('ExpoWidgets')) {
      console.log('[bridge] iOS widget skipped (native module unavailable)');
      return;
    }
    let createWidget: ((...args: unknown[]) => { updateTimeline: (entries: unknown[]) => void }) | undefined;
    try {
      // expo-widgets is iOS-only and only available in native dev/prod builds.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-widgets') as { createWidget?: (...args: unknown[]) => { updateTimeline: (entries: unknown[]) => void } } | undefined;
      createWidget = mod?.createWidget;
    } catch {
      // Module not compiled in (Expo Go / simulator) — skip silently
      console.log('[bridge] iOS widget skipped (expo-widgets unavailable in dev)');
      return;
    }
    if (!createWidget) {
      console.log('[bridge] iOS widget skipped (expo-widgets unavailable in dev)');
      return;
    }
    try {
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
