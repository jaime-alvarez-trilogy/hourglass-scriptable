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
  // ── 1. Brand palette (02-ios-visual) ───────────────────────────────────────
  var BG             = '#0D0C14';
  var GOLD           = '#E8C97A';   // earnings only
  var GOLD_BRIGHT    = '#FFDF89';   // crushed_it badge/mesh only
  var CYAN           = '#00C2FF';   // AI % only
  var VIOLET         = '#A78BFA';   // BrainLift only
  var TEXT_PRIMARY   = '#E0E0E0';   // primary values — never #FFFFFF
  var TEXT_SECONDARY = '#A0A0A0';   // secondary metadata
  var TEXT_MUTED     = '#757575';   // timestamps, labels
  var TRACK_COLOR    = '#2F2E41';   // progress bar track
  var SURFACE_TOP    = '#1A1928';   // glass panel gradient top
  var SURFACE_BTM    = '#131220';   // glass panel gradient bottom
  var BORDER_TOP     = '#3D3B54';   // glass border gradient top

  // Hours color tracks urgency state
  var HOURS_COLOR = {
    none:     '#10B981',
    low:      '#10B981',
    high:     '#F59E0B',
    critical: '#F43F5E',
    expired:  '#757575'
  };

  // Badge colors for approval category / request status labels
  var BADGE_COLORS = {
    MANUAL:   '#00C2FF',
    OVERTIME: '#A78BFA',
    PENDING:  '#F59E0B',
    APPROVED: '#10B981',
    REJECTED: '#F43F5E'
  };

  // Pace badge label and color maps
  // 04-cockpit-hud: desaturated dark glass tokens (luxuryGold, successGreen, warnAmber, desatCoral)
  var PACE_COLORS = {
    crushed_it: '#CEA435',
    on_track:   '#4ADE80',
    behind:     '#FCD34D',
    critical:   '#F87171'
  };
  var PACE_LABELS = {
    crushed_it: 'CRUSHED IT',
    on_track:   'ON TRACK',
    behind:     'BEHIND PACE',
    critical:   'CRITICAL'
  };

  // ── 2. Derived state ────────────────────────────────────────────────────────
  var hoursColor   = HOURS_COLOR[props.urgency] || HOURS_COLOR.none;
  var hasApprovals = props.approvalItems && props.approvalItems.length > 0;
  var hasRequests  = props.myRequests && props.myRequests.length > 0;
  var actionMode   = hasApprovals || hasRequests;
  var actionItems  = hasApprovals ? props.approvalItems : (props.myRequests || []);
  var family       = (env && env.widgetFamily) || 'systemMedium';
  var fillFrame    = frame({ maxWidth: 9999, maxHeight: 9999 });

  // ── 3. buildMeshBg(urgency, paceBadge) ─────────────────────────────────────
  // Simulates the app's orbital mesh background with 3 overlapping Circle nodes.
  // Node A: violet (always); Node B: cyan (always); Node C: urgency/pace state color.
  function buildMeshBg(urgency, paceBadge) {
    var nodeCColor = '#10B981';
    var nodeCOpacity = 0.14;
    if (urgency === 'critical') {
      nodeCColor = '#F43F5E'; nodeCOpacity = 0.20;
    } else if (urgency === 'high') {
      nodeCColor = '#F59E0B'; nodeCOpacity = 0.16;
    } else if (paceBadge === 'crushed_it') {
      nodeCColor = GOLD_BRIGHT; nodeCOpacity = 0.14;
    }
    return ZStack({
      children: [
        Rectangle({ modifiers: [foregroundStyle(BG), fillFrame] }),
        Circle({ modifiers: [foregroundStyle('#A78BFA'), opacity(0.12),
          frame({ width: 120, height: 120 }), offset({ x: -50, y: -40 })] }),
        Circle({ modifiers: [foregroundStyle('#00C2FF'), opacity(0.10),
          frame({ width: 100, height: 100 }), offset({ x: 60, y: 30 })] }),
        Circle({ modifiers: [foregroundStyle(nodeCColor), opacity(nodeCOpacity),
          frame({ width: 90, height: 90 }), offset({ x: 0, y: 50 })] })
      ]
    });
  }

  // ── 4. buildGlassPanel(children) ───────────────────────────────────────────
  // Simulates frosted glass: gradient fill + border overlay + content.
  // NOTE: LinearGradient is NOT a function — pass plain object { type, colors, startPoint, endPoint }
  function buildGlassPanel(children) {
    return ZStack({
      alignment: 'leading',
      children: [
        RoundedRectangle({
          cornerRadius: 12,
          modifiers: [
            foregroundStyle({
              type: 'linearGradient',
              colors: [SURFACE_TOP, SURFACE_BTM],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 }
            }),
            opacity(0.85)
          ]
        }),
        RoundedRectangle({
          cornerRadius: 12,
          modifiers: [
            foregroundStyle({
              type: 'linearGradient',
              colors: [BORDER_TOP, SURFACE_TOP],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 }
            }),
            frame({ maxWidth: 9999, maxHeight: 9999 })
          ]
        }),
        VStack({
          alignment: 'leading',
          spacing: 2,
          modifiers: [padding({ all: 10 })],
          children: children
        })
      ]
    });
  }

  // ── 5. buildPaceBadge(badge) ────────────────────────────────────────────────
  // Returns Capsule background + label Text for known badges; null for 'none'/unknown.
  function buildPaceBadge(badge) {
    if (!badge || badge === 'none' || !PACE_COLORS[badge]) { return null; }
    var badgeColor = PACE_COLORS[badge];
    var badgeLabel = PACE_LABELS[badge];
    return ZStack({
      children: [
        Capsule({ modifiers: [foregroundStyle(badgeColor), opacity(0.20),
          frame({ height: 20 })] }),
        Text({
          modifiers: [foregroundStyle(badgeColor), font({ size: 10, weight: 'semibold' }),
            padding({ all: 4 })],
          children: badgeLabel
        })
      ]
    });
  }

  // ── 6. buildDeltaText(delta, color) ─────────────────────────────────────────
  // Returns a colored Text with the delta string, or null if delta is empty/falsy.
  function buildDeltaText(delta, color) {
    if (!delta) { return null; }
    return Text({
      modifiers: [foregroundStyle(color), font({ size: 11 })],
      children: delta
    });
  }

  // ── 7. buildProgressBar(value, targetStr, color, barWidth) ──────────────────
  // Renders a filled + track RoundedRectangle pair.
  // targetStr: e.g. "5h" — parseFloat strips the "h" suffix automatically.
  function buildProgressBar(value, targetStr, color, barWidth) {
    var target = parseFloat(targetStr) || 5;
    var fillPct = Math.min(value / target, 1.0);
    var filled = Math.max(4, Math.round(fillPct * barWidth));
    var track = Math.max(4, barWidth - filled);
    return HStack({
      spacing: 3,
      children: [
        RoundedRectangle({ cornerRadius: 2,
          modifiers: [foregroundStyle(color), frame({ width: filled, height: 5 })] }),
        RoundedRectangle({ cornerRadius: 2,
          modifiers: [foregroundStyle(TRACK_COLOR), frame({ width: track, height: 5 })] })
      ]
    });
  }

  // ── 8. buildItemRow(item) ───────────────────────────────────────────────────
  // Action-mode row: name/memo · hours · category/status badge. Glass panel wrapped.
  function buildItemRow(item) {
    var badgeKey = item.category || item.status || 'MANUAL';
    var badgeColor = BADGE_COLORS[badgeKey] || TEXT_MUTED;
    return buildGlassPanel([
      HStack({
        spacing: 6,
        children: [
          Text({
            modifiers: [foregroundStyle(TEXT_PRIMARY), font({ size: 12 })],
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
      })
    ]);
  }

  // ── 9. buildSmall(p) ────────────────────────────────────────────────────────
  // systemSmall: mesh bg + hours hero + earnings + remaining + pace badge.
  // Manager urgency mode: pendingCount hero when isManager + high/critical + pending > 0.
  // P2 mode: stripped deficit layout when paceBadge=behind/critical and no action mode.
  function buildSmall(p) {
    var pg = p.paceBadge;
    var urg = p.urgency || 'none';
    var hColor = HOURS_COLOR[urg] || HOURS_COLOR.none;
    var badgeNode = buildPaceBadge(pg);
    var isUrgentMgr = p.isManager && (urg === 'high' || urg === 'critical') && p.pendingCount > 0;
    var hasApprovalsSmall = p.approvalItems && p.approvalItems.length > 0;
    var hasRequestsSmall = p.myRequests && p.myRequests.length > 0;
    var actionModeSmall = hasApprovalsSmall || hasRequestsSmall;
    var isPaceMode = !actionModeSmall && (pg === 'behind' || pg === 'critical');

    // P2: stripped deficit layout
    if (isPaceMode) {
      var paceColor = PACE_COLORS[pg] || hColor;
      var paceLabel = PACE_LABELS[pg] || pg;
      return ZStack({
        children: [
          buildMeshBg(urg, pg),
          VStack({
            alignment: 'leading',
            spacing: 4,
            modifiers: [padding({ all: 14 }), fillFrame],
            children: [
              Text({ modifiers: [foregroundStyle(paceColor), font({ size: 10, weight: 'semibold' })],
                children: '\u26A0 ' + paceLabel }),
              Text({ modifiers: [foregroundStyle(hColor), font({ size: 28, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle(TEXT_SECONDARY), font({ size: 12, weight: 'medium' })],
                children: p.hoursRemaining })
            ]
          })
        ]
      });
    }

    var heroText = isUrgentMgr
      ? Text({ modifiers: [foregroundStyle(hColor), font({ size: 36, weight: 'heavy', design: 'monospaced' })],
          children: String(p.pendingCount) })
      : Text({ modifiers: [foregroundStyle(hColor), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
          children: p.hoursDisplay });

    var subLabel = isUrgentMgr
      ? Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'pending' })
      : Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'this week' });

    var bottomRow = isUrgentMgr
      ? Text({ modifiers: [foregroundStyle(hColor), font({ size: 12 })], children: 'review now' })
      : Text({ modifiers: [foregroundStyle(hColor), font({ size: 12 })], children: p.hoursRemaining });

    var contentChildren = [
      heroText,
      subLabel,
      Spacer({}),
      Text({ modifiers: [foregroundStyle(GOLD), font({ size: 20, weight: 'bold' })], children: p.earnings }),
      bottomRow
    ];
    if (badgeNode) { contentChildren.push(badgeNode); }

    return ZStack({
      children: [
        buildMeshBg(urg, pg),
        VStack({
          alignment: 'leading',
          spacing: 2,
          modifiers: [padding({ all: 14 }), fillFrame],
          children: contentChildren
        })
      ]
    });
  }

  // ── 10. buildMedium(p) ──────────────────────────────────────────────────────
  // systemMedium hours mode: mesh + dual glass panels + stats row + delta + badge.
  // Action mode: mesh + glass item rows.
  // P2 mode: stripped deficit layout when paceBadge=behind/critical and no action mode.
  function buildMedium(p) {
    var pg = p.paceBadge;
    var urg = p.urgency || 'none';
    var hColor = HOURS_COLOR[urg] || HOURS_COLOR.none;
    var badgeNode = buildPaceBadge(pg);
    var deltaHours = buildDeltaText(p.weekDeltaHours, hColor);
    var isPaceModeMed = !actionMode && (pg === 'behind' || pg === 'critical');

    if (actionMode) {
      var medItems = actionItems.slice(0, 2);
      var medRows = medItems.map(function(item) { return buildItemRow(item); });
      var mgCount = p.pendingCount || actionItems.length;
      var headerChildren = [
        Text({ modifiers: [foregroundStyle(hColor), font({ size: 16, weight: 'heavy', design: 'monospaced' })],
          children: p.hoursDisplay }),
        Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 14 })], children: ' · ' }),
        Text({ modifiers: [foregroundStyle(GOLD), font({ size: 14, weight: 'semibold' })],
          children: p.earnings })
      ];
      if (badgeNode) { headerChildren.push(Spacer({})); headerChildren.push(badgeNode); }
      return ZStack({
        children: [
          buildMeshBg(urg, pg),
          VStack({
            alignment: 'leading',
            spacing: 10,
            modifiers: [padding({ all: 14 }), fillFrame],
            children: [HStack({ spacing: 6, children: headerChildren })].concat(medRows)
          })
        ]
      });
      void mgCount;
    }

    // P2: stripped deficit layout
    if (isPaceModeMed) {
      var paceColorMed = PACE_COLORS[pg] || hColor;
      var paceLabelMed = PACE_LABELS[pg] || pg;
      var deltaEarningsMed = p.weekDeltaEarnings || '';
      var deltaColorMed = deltaEarningsMed.charAt(0) === '+' ? HOURS_COLOR.none : (deltaEarningsMed.charAt(0) === '-' ? HOURS_COLOR.high : TEXT_MUTED);
      return ZStack({
        children: [
          buildMeshBg(urg, pg),
          VStack({
            alignment: 'leading',
            spacing: 8,
            modifiers: [padding({ all: 14 }), fillFrame],
            children: [
              HStack({ spacing: 4, children: [
                Text({ modifiers: [foregroundStyle(paceColorMed), font({ size: 11, weight: 'semibold' })],
                  children: '\u26A0 ' + paceLabelMed })
              ]}),
              Text({ modifiers: [foregroundStyle(hColor), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle(TEXT_SECONDARY), font({ size: 13, weight: 'medium' })],
                children: p.hoursRemaining }),
              Spacer({}),
              HStack({ children: [
                Text({ modifiers: [foregroundStyle(deltaColorMed), font({ size: 12 })],
                  children: deltaEarningsMed }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(TEXT_SECONDARY), font({ size: 12 })],
                  children: 'today ' + (p.today || '') })
              ]})
            ]
          })
        ]
      });
    }

    // Hours mode
    var hoursPanel = buildGlassPanel([
      Text({ modifiers: [foregroundStyle(hColor), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
        children: p.hoursDisplay }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'this week' }),
      deltaHours || Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 1 })], children: '' })
    ]);

    var earningsPanel = buildGlassPanel([
      Text({ modifiers: [foregroundStyle(GOLD), font({ size: 20, weight: 'bold' })],
        children: p.earnings }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'earned' })
    ]);

    var statsRow = HStack({
      children: [
        VStack({ alignment: 'leading', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'TODAY' }),
          Text({ modifiers: [foregroundStyle(TEXT_PRIMARY), font({ size: 13, weight: 'semibold' })],
            children: p.today })
        ]}),
        Spacer({}),
        VStack({ alignment: 'leading', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'AI USAGE' }),
          Text({ modifiers: [foregroundStyle(CYAN), font({ size: 13, weight: 'semibold' })],
            children: p.aiPct })
        ]}),
        Spacer({}),
        VStack({ alignment: 'trailing', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'REMAINING' }),
          Text({ modifiers: [foregroundStyle(hColor), font({ size: 13, weight: 'semibold' })],
            children: p.hoursRemaining })
        ]})
      ]
    });

    var bottomChildren = [statsRow];
    if (badgeNode) { bottomChildren.push(badgeNode); }

    return ZStack({
      children: [
        buildMeshBg(urg, pg),
        VStack({
          alignment: 'leading',
          spacing: 10,
          modifiers: [padding({ all: 14 }), fillFrame],
          children: [
            HStack({ spacing: 8, children: [hoursPanel, earningsPanel] }),
            Spacer({})
          ].concat(bottomChildren)
        })
      ]
    });
  }

  // ── 11. buildLarge(p) ───────────────────────────────────────────────────────
  // systemLarge: full dashboard — hero panels, stats, badge, bar chart, progress bars.
  // Action mode: mesh + glass item rows.
  // P2 mode: stripped deficit layout when paceBadge=behind/critical and no action mode.
  function buildLarge(p) {
    var pg = p.paceBadge;
    var urg = p.urgency || 'none';
    var hColor = HOURS_COLOR[urg] || HOURS_COLOR.none;
    var badgeNode = buildPaceBadge(pg);
    var deltaHours = buildDeltaText(p.weekDeltaHours, hColor);
    var deltaEarnings = buildDeltaText(p.weekDeltaEarnings, GOLD);
    var isPaceModeLg = !actionMode && (pg === 'behind' || pg === 'critical');

    if (actionMode) {
      var lgItems = actionItems.slice(0, 4);
      var moreCount = (p.pendingCount || actionItems.length) - 4;
      var lgRows = lgItems.map(function(item) { return buildItemRow(item); });
      if (moreCount > 0) {
        lgRows.push(HStack({ children: [
          Spacer({}),
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })],
            children: '+' + moreCount + ' more' })
        ]}));
      }
      return ZStack({
        children: [
          buildMeshBg(urg, pg),
          VStack({
            alignment: 'leading',
            spacing: 12,
            modifiers: [padding({ all: 18 }), fillFrame],
            children: [
              HStack({ spacing: 6, children: [
                Text({ modifiers: [foregroundStyle(hColor), font({ size: 18, weight: 'heavy', design: 'monospaced' })],
                  children: p.hoursDisplay }),
                Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 16 })],
                  children: ' · ' }),
                Text({ modifiers: [foregroundStyle(GOLD), font({ size: 16, weight: 'semibold' })],
                  children: p.earnings })
              ]})
            ].concat(lgRows)
          })
        ]
      });
    }

    // P2: stripped deficit layout
    if (isPaceModeLg) {
      var paceColorLg = PACE_COLORS[pg] || hColor;
      var paceLabelLg = PACE_LABELS[pg] || pg;
      var deltaEarningsLg = p.weekDeltaEarnings || '';
      var deltaColorLg = deltaEarningsLg.charAt(0) === '+' ? HOURS_COLOR.none : (deltaEarningsLg.charAt(0) === '-' ? HOURS_COLOR.high : TEXT_MUTED);
      return ZStack({
        children: [
          buildMeshBg(urg, pg),
          VStack({
            alignment: 'leading',
            spacing: 8,
            modifiers: [padding({ all: 18 }), fillFrame],
            children: [
              HStack({ spacing: 4, children: [
                Text({ modifiers: [foregroundStyle(paceColorLg), font({ size: 11, weight: 'semibold' })],
                  children: '\u26A0 ' + paceLabelLg })
              ]}),
              Text({ modifiers: [foregroundStyle(hColor), font({ size: 32, weight: 'heavy', design: 'monospaced' })],
                children: p.hoursDisplay }),
              Text({ modifiers: [foregroundStyle(TEXT_SECONDARY), font({ size: 13, weight: 'medium' })],
                children: p.hoursRemaining }),
              Spacer({}),
              HStack({ children: [
                Text({ modifiers: [foregroundStyle(deltaColorLg), font({ size: 12 })],
                  children: deltaEarningsLg }),
                Spacer({}),
                Text({ modifiers: [foregroundStyle(TEXT_SECONDARY), font({ size: 12 })],
                  children: 'today ' + (p.today || '') })
              ]})
            ]
          })
        ]
      });
    }

    // Bar chart
    var activeDays = (p.daily || []).filter(function(d) { return d.hours > 0; });
    var barRows = [];
    if (activeDays.length > 0) {
      var maxHours = Math.max.apply(null, activeDays.map(function(d) { return d.hours; }).concat([8]));
      barRows = activeDays.map(function(entry) {
        var barWidth = Math.max(4, Math.round((entry.hours / maxHours) * 220));
        var barColor = entry.isToday ? hColor : '#3D3B54';
        var valueColor = entry.isToday ? hColor : TEXT_SECONDARY;
        return HStack({
          spacing: 5,
          children: [
            Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 }),
              frame({ width: 26 })], children: entry.day }),
            RoundedRectangle({ cornerRadius: 3,
              modifiers: [foregroundStyle(barColor), frame({ width: barWidth, height: 7 })] }),
            Spacer({}),
            Text({ modifiers: [foregroundStyle(valueColor), font({ size: 11 })],
              children: entry.hours.toFixed(1) + 'h' })
          ]
        });
      });
    }

    // AI progress bar
    var avgAIPct = 0;
    var aiMatch = p.aiPct ? p.aiPct.match(/(\d+)[^\d]+(\d+)/) : null;
    if (aiMatch) { avgAIPct = (parseFloat(aiMatch[1]) + parseFloat(aiMatch[2])) / 2; }

    // BrainLift progress bar — uses brainliftTarget from 01-data-extensions
    var blHours = parseFloat(p.brainlift) || 0;
    var blTarget = p.brainliftTarget || '5h';

    // Hero panels
    var hoursEarningsChildren = [
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'this week' }),
      deltaHours
    ].filter(Boolean);
    hoursEarningsChildren.unshift(
      Text({ modifiers: [foregroundStyle(hColor), font({ size: 34, weight: 'heavy', design: 'monospaced' })],
        children: p.hoursDisplay })
    );

    var earningsChildren = [
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: 'earned' }),
      deltaEarnings
    ].filter(Boolean);
    earningsChildren.unshift(
      Text({ modifiers: [foregroundStyle(GOLD), font({ size: 26, weight: 'semibold' })],
        children: p.earnings })
    );

    var hoursPanel = buildGlassPanel(hoursEarningsChildren);
    var earningsPanel = buildGlassPanel(earningsChildren);

    var statsRow = HStack({
      children: [
        VStack({ alignment: 'leading', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'TODAY' }),
          Text({ modifiers: [foregroundStyle(TEXT_PRIMARY), font({ size: 14, weight: 'semibold' })],
            children: p.today }),
          deltaHours || Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 1 })],
            children: '' })
        ]}),
        Spacer({}),
        VStack({ alignment: 'leading', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'AI USAGE' }),
          Text({ modifiers: [foregroundStyle(CYAN), font({ size: 14, weight: 'semibold' })],
            children: p.aiPct })
        ]}),
        Spacer({}),
        VStack({ alignment: 'trailing', spacing: 1, children: [
          Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'REMAINING' }),
          Text({ modifiers: [foregroundStyle(hColor), font({ size: 14, weight: 'semibold' })],
            children: p.hoursRemaining })
        ]})
      ]
    });

    var mainChildren = [
      HStack({ children: [hoursPanel, Spacer({}), earningsPanel] }),
      Spacer({}),
      statsRow
    ];
    if (badgeNode) { mainChildren.push(badgeNode); }
    mainChildren.push(Spacer({}));
    if (barRows.length > 0) {
      mainChildren.push(VStack({ alignment: 'leading', spacing: 5, children: barRows }));
      mainChildren.push(Spacer({}));
    }
    // AI progress bar row
    mainChildren.push(HStack({ spacing: 5, children: [
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 }),
        frame({ width: 16 })], children: 'AI' }),
      buildProgressBar(avgAIPct, '100', CYAN, 190),
      Text({ modifiers: [foregroundStyle(CYAN), font({ size: 10 })], children: p.aiPct })
    ]}));
    mainChildren.push(Spacer({ minLength: 4 }));
    // BrainLift progress bar row
    mainChildren.push(HStack({ spacing: 5, children: [
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 }),
        frame({ width: 16 })], children: 'BL' }),
      buildProgressBar(blHours, blTarget, VIOLET, 190),
      Text({ modifiers: [foregroundStyle(VIOLET), font({ size: 10 })],
        children: p.brainlift + ' / ' + blTarget })
    ]}));

    return ZStack({
      children: [
        buildMeshBg(urg, pg),
        VStack({
          alignment: 'leading',
          spacing: 0,
          modifiers: [padding({ all: 14 }), fillFrame],
          children: mainChildren
        })
      ]
    });
  }

  // ── 12. buildAccessory(p, fam) ──────────────────────────────────────────────
  // Lock screen complication sizes — cosmetic color updates only.
  function buildAccessory(p, fam) {
    var hColor = HOURS_COLOR[(p.urgency || 'none')] || HOURS_COLOR.none;
    if (fam === 'accessoryCircular') {
      return VStack({ alignment: 'center', spacing: 0, children: [
        Text({ modifiers: [foregroundStyle(hColor), font({ size: 18, weight: 'bold' })],
          children: p.hours || '0.0' }),
        Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 10 })], children: 'h' })
      ]});
    }
    if (fam === 'accessoryInline') {
      return Text({
        modifiers: [foregroundStyle(hColor)],
        children: (p.hoursDisplay || '0h') + ' · ' + (p.earnings || '$0') + ' · AI ' + (p.aiPct || 'N/A')
      });
    }
    // accessoryRectangular (default)
    return HStack({ spacing: 4, children: [
      Text({ modifiers: [foregroundStyle(hColor), font({ size: 13, weight: 'bold' })],
        children: p.hoursDisplay || '0h' }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: '·' }),
      Text({ modifiers: [foregroundStyle(GOLD), font({ size: 13, weight: 'semibold' })],
        children: p.earnings || '$0' }),
      Text({ modifiers: [foregroundStyle(TEXT_MUTED), font({ size: 11 })], children: '·' }),
      Text({ modifiers: [foregroundStyle(CYAN), font({ size: 11 })],
        children: 'AI ' + (p.aiPct || 'N/A') })
    ]});
  }

  // ── 13. Router ──────────────────────────────────────────────────────────────
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
