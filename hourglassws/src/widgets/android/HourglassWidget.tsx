// FR1–FR7: Android Widget Component (react-native-android-widget) — 03-android-visual
// Brand redesign: SVG mesh background, glass panel cards, pace badge,
// trend deltas, BrainLift progress bar, manager urgency mode.
//
// Data is read from AsyncStorage 'widget_data' by the task handler
// and passed here as props for rendering.

import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import type { WidgetData, WidgetUrgency } from '../types';

// ─── FR1: Helper functions (exported for unit testing) ────────────────────────

/**
 * Builds the SVG mesh background string (360×200).
 * Three radial gradient ellipses simulate the orbital mesh.
 * Node C color is driven by urgency/paceBadge state.
 */
export function buildMeshSvg(urgency: WidgetUrgency, paceBadge: string): string {
  const stateColor = meshStateColor(urgency, paceBadge);
  return (
    `<svg width="360" height="200" xmlns="http://www.w3.org/2000/svg">` +
    `<defs>` +
    `<radialGradient id="va" cx="25%" cy="30%" r="50%">` +
    `<stop offset="0%" stop-color="#A78BFA" stop-opacity="0.12"/>` +
    `<stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="cb" cx="75%" cy="60%" r="45%">` +
    `<stop offset="0%" stop-color="#00C2FF" stop-opacity="0.10"/>` +
    `<stop offset="100%" stop-color="#00C2FF" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="sc" cx="50%" cy="80%" r="40%">` +
    `<stop offset="0%" stop-color="${stateColor}" stop-opacity="0.14"/>` +
    `<stop offset="100%" stop-color="${stateColor}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="#0D0C14"/>` +
    `<ellipse cx="90" cy="60" rx="130" ry="100" fill="url(#va)"/>` +
    `<ellipse cx="270" cy="120" rx="120" ry="90" fill="url(#cb)"/>` +
    `<ellipse cx="180" cy="160" rx="110" ry="80" fill="url(#sc)"/>` +
    `</svg>`
  );
}

function meshStateColor(urgency: WidgetUrgency, paceBadge: string): string {
  if (urgency === 'critical' || paceBadge === 'critical') return '#F43F5E';
  if (urgency === 'high' || paceBadge === 'behind') return '#F59E0B';
  if (paceBadge === 'crushed_it') return '#FFDF89';
  if (paceBadge === 'on_track') return '#10B981';
  return '#A78BFA'; // idle/none — default violet
}

/**
 * Returns the background hex color for a pace badge capsule.
 * Returns '' for 'none' (no badge should render).
 */
export function badgeColor(paceBadge: string): string {
  switch (paceBadge) {
    case 'crushed_it': return '#FFDF89';
    case 'on_track':   return '#10B981';
    case 'behind':     return '#F59E0B';
    case 'critical':   return '#F43F5E';
    default:           return '';
  }
}

/**
 * Returns the display label for a pace badge.
 * Returns '' for 'none' (no badge should render).
 */
export function badgeLabel(paceBadge: string): string {
  switch (paceBadge) {
    case 'crushed_it': return 'CRUSHED IT';
    case 'on_track':   return 'ON TRACK';
    case 'behind':     return 'BEHIND PACE';
    case 'critical':   return 'CRITICAL';
    default:           return '';
  }
}

/**
 * Returns the text color for a delta string.
 * '+...' → success green, '-...' → warning amber, empty/missing → transparent.
 */
export function deltaColor(delta: string | undefined): string {
  if (!delta) return 'transparent';
  if (delta.startsWith('+')) return '#10B981';
  if (delta.startsWith('-')) return '#F59E0B';
  return 'transparent';
}

/**
 * Generates an inline SVG string for the BrainLift progress bar.
 * Track: #2F2E41, fill: #A78BFA (violet), height 6px, rx 3.
 * Fill width is capped at 100%. NaN brainliftHours treated as 0.
 */
export function blProgressBar(brainliftHours: number, targetHours: number, width: number): string {
  const safeHours = isNaN(brainliftHours) ? 0 : brainliftHours;
  const fillWidth = Math.round(Math.min(safeHours / targetHours, 1) * width);
  return (
    `<svg width="${width}" height="6" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${width}" height="6" rx="3" fill="#2F2E41"/>` +
    `<rect width="${fillWidth}" height="6" rx="3" fill="#A78BFA"/>` +
    `</svg>`
  );
}

// ─── Urgency color mapping (for text accents) ─────────────────────────────────

const URGENCY_ACCENT: Record<string, string> = {
  none:     '#00FF88',
  low:      '#F5C842',
  high:     '#FF6B00',
  critical: '#FF2D55',
  expired:  '#6B6B6B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > 2 * 60 * 60 * 1000;
}

function formatCachedTime(cachedAt: number): string {
  const d = new Date(cachedAt);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatCountdown(deadline: number): string {
  const hoursLeft = Math.max(0, Math.floor((deadline - Date.now()) / 3600000));
  return hoursLeft > 0 ? `${hoursLeft}h left` : 'Due now';
}

function formatDelta(delta: string | undefined): string {
  if (!delta) return '';
  if (delta.startsWith('+')) return `↑ ${delta.slice(1)}`;
  if (delta.startsWith('-')) return `↓ ${delta.slice(1)}`;
  return '';
}

// ─── FR3: Glass panel border trick ────────────────────────────────────────────

interface GlassPanelProps {
  flex?: number;
  children: React.ReactNode;
}

function GlassPanel({ flex, children }: GlassPanelProps) {
  return (
    <FlexWidget
      style={{
        backgroundColor: '#2F2E41',
        borderRadius: 13,
        padding: 1,
        ...(flex !== undefined ? { flex } : {}),
      }}
    >
      <FlexWidget
        style={{
          backgroundColor: '#16151F',
          borderRadius: 12,
          padding: 12,
        }}
      >
        {children}
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── FR4: Pace badge ──────────────────────────────────────────────────────────

interface PaceBadgeProps {
  paceBadge: string | undefined;
}

function PaceBadge({ paceBadge }: PaceBadgeProps) {
  if (!paceBadge || paceBadge === 'none') return null;
  const bg = badgeColor(paceBadge);
  const label = badgeLabel(paceBadge);
  if (!bg || !label) return null;

  return (
    <FlexWidget
      style={{
        backgroundColor: bg,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <TextWidget
        text={label}
        style={{ color: '#0D0C14', fontSize: 11, fontWeight: 'bold' }}
      />
    </FlexWidget>
  );
}

// ─── Fallback widget ───────────────────────────────────────────────────────────

export function FallbackWidget() {
  return (
    <FlexWidget
      style={{
        backgroundColor: '#0D0C14',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text="Hourglass"
        style={{ color: '#E0E0E0', fontSize: 16, fontWeight: 'bold' }}
      />
      <TextWidget
        text="Tap to refresh"
        style={{ color: '#A0A0A0', fontSize: 12 }}
      />
    </FlexWidget>
  );
}

// ─── FR2 + FR3 + FR4 + FR5: Small widget ──────────────────────────────────────

function SmallWidget({ data }: { data: WidgetData }) {
  const accent = URGENCY_ACCENT[data.urgency] ?? URGENCY_ACCENT.none;
  const stale = isStale(data.cachedAt);
  const meshSvg = buildMeshSvg(data.urgency, data.paceBadge ?? 'none');

  return (
    <FlexWidget
      style={{
        backgroundColor: '#0D0C14',
        flex: 1,
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* FR2: SVG mesh background */}
      <SvgWidget
        svg={meshSvg}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* FR3: Glass panel wrapping all content */}
      <GlassPanel flex={1}>
        {/* Hours total */}
        <TextWidget
          text={data.hoursDisplay}
          style={{ color: accent, fontSize: 28, fontWeight: 'bold' }}
        />

        {/* Earnings */}
        <TextWidget
          text={data.earnings}
          style={{ color: '#E8C97A', fontSize: 14 }}
        />

        {/* FR4: Pace badge */}
        <PaceBadge paceBadge={data.paceBadge} />

        {/* Hours remaining */}
        <TextWidget
          text={data.hoursRemaining}
          style={{ color: '#A0A0A0', fontSize: 12 }}
        />

        {/* Stale indicator */}
        {stale && (
          <TextWidget
            text={`Cached: ${formatCachedTime(data.cachedAt)}`}
            style={{ color: '#FF9500', fontSize: 10 }}
          />
        )}

        {/* Manager pending badge */}
        {data.isManager && data.pendingCount > 0 && (
          <TextWidget
            text={`${data.pendingCount} pending`}
            style={{ color: '#FF3B30', fontSize: 11 }}
          />
        )}
      </GlassPanel>
    </FlexWidget>
  );
}

// ─── Action mode badge colors ──────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  MANUAL:   '#00C2FF',
  OVERTIME: '#A78BFA',
  PENDING:  '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#F43F5E',
};

// ─── FR2 + FR3 + FR4 + FR5 + FR6 + FR7: Medium widget ────────────────────────

function MediumWidget({ data }: { data: WidgetData }) {
  const accent = URGENCY_ACCENT[data.urgency] ?? URGENCY_ACCENT.none;
  const stale = isStale(data.cachedAt);
  const meshSvg = buildMeshSvg(data.urgency, data.paceBadge ?? 'none');

  // FR7: Urgency mode — manager with high/critical urgency and pending approvals
  const isUrgencyMode =
    data.isManager &&
    (data.urgency === 'high' || data.urgency === 'critical') &&
    data.pendingCount > 0;

  // Existing action mode: approvals or my requests (non-urgency)
  const hasApprovals = data.approvalItems && data.approvalItems.length > 0;
  const hasRequests = data.myRequests && data.myRequests.length > 0;
  const actionMode = !isUrgencyMode && (hasApprovals || hasRequests);

  // FR6: BrainLift progress bar data
  const brainliftHours = parseFloat(data.brainlift) || 0;
  const targetHours = parseFloat(data.brainliftTarget ?? '5h') || 5;

  // FR5: Delta display helpers
  const hoursDelta = data.weekDeltaHours ?? '';
  const earningsDelta = data.weekDeltaEarnings ?? '';
  const hoursDeltaText = formatDelta(hoursDelta);
  const earningsDeltaText = formatDelta(earningsDelta);

  // ─── FR7: Urgency mode layout ───────────────────────────────────────────────
  if (isUrgencyMode) {
    const approvalItems = (data.approvalItems ?? []).slice(0, 2);
    const countdown = formatCountdown(data.deadline);

    return (
      <FlexWidget
        style={{
          backgroundColor: '#0D0C14',
          flex: 1,
          flexDirection: 'column',
          position: 'relative',
          padding: 12,
        }}
      >
        {/* FR2: SVG mesh background */}
        <SvgWidget
          svg={meshSvg}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Countdown hero row */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={countdown}
            style={{ color: accent, fontSize: 28, fontWeight: 'bold', flex: 1 }}
          />
          <TextWidget
            text={`${data.pendingCount} pending`}
            style={{ color: accent, fontSize: 13, fontWeight: '600' }}
          />
        </FlexWidget>

        {/* Secondary hours/earnings row */}
        <TextWidget
          text={`${data.hoursDisplay}  ·  ${data.earnings}`}
          style={{ color: '#A0A0A0', fontSize: 12 }}
        />

        <TextWidget text="" style={{ height: 4 }} />

        {/* Approval items */}
        {approvalItems.map((item) => {
          const badgeKey = item.category ?? '';
          const badgeClr = BADGE_COLORS[badgeKey] ?? '#A0A0A0';
          return (
            <FlexWidget
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
            >
              <TextWidget
                text={item.name}
                style={{ color: '#E0E0E0', fontSize: 12, flex: 1 }}
              />
              <TextWidget
                text={item.hours}
                style={{ color: accent, fontSize: 12, fontWeight: '600' }}
              />
              <TextWidget text=" " style={{ fontSize: 12 }} />
              <TextWidget
                text={badgeKey}
                style={{ color: badgeClr, fontSize: 11 }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    );
  }

  // ─── Action mode (approvals / my requests — non-urgency) ────────────────────
  if (actionMode) {
    const actionItems = hasApprovals
      ? (data.approvalItems ?? [])
      : (data.myRequests ?? []);
    const displayItems = actionItems.slice(0, 2);
    const actionBg = data.actionBg || '#0D0C14';

    return (
      <FlexWidget
        style={{
          backgroundColor: actionBg,
          flex: 1,
          flexDirection: 'column',
          position: 'relative',
          padding: 12,
        }}
      >
        {/* FR2: SVG mesh background */}
        <SvgWidget
          svg={meshSvg}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Compact hero */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={`${data.hoursDisplay}  ·  ${data.earnings}`}
            style={{ color: accent, fontSize: 14, fontWeight: 'bold' }}
          />
        </FlexWidget>

        <TextWidget text="" style={{ height: 6 }} />

        {/* Item rows */}
        {displayItems.map((item) => {
          const badgeKey = ('category' in item ? item.category : item.status) ?? '';
          const badgeClr = BADGE_COLORS[badgeKey] ?? '#A0A0A0';
          const label = ('name' in item ? item.name : item.memo) ?? '';
          return (
            <FlexWidget
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
            >
              <TextWidget
                text={label}
                style={{ color: '#E0E0E0', fontSize: 12, flex: 1 }}
              />
              <TextWidget
                text={item.hours}
                style={{ color: accent, fontSize: 12, fontWeight: '600' }}
              />
              <TextWidget text=" " style={{ fontSize: 12 }} />
              <TextWidget
                text={badgeKey}
                style={{ color: badgeClr, fontSize: 11 }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    );
  }

  // ─── Hours mode (standard display) ──────────────────────────────────────────
  return (
    <FlexWidget
      style={{
        backgroundColor: '#0D0C14',
        flex: 1,
        flexDirection: 'column',
        position: 'relative',
        padding: 12,
      }}
    >
      {/* FR2: SVG mesh background */}
      <SvgWidget
        svg={meshSvg}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top row: FR3 glass hero panels */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Hours glass panel */}
        <GlassPanel flex={1}>
          <TextWidget
            text={data.hoursDisplay}
            style={{ color: accent, fontSize: 32, fontWeight: 'bold' }}
          />
          <TextWidget
            text="this week"
            style={{ color: '#A0A0A0', fontSize: 12 }}
          />
          {/* FR5: hours delta */}
          {hoursDeltaText.length > 0 && (
            <TextWidget
              text={hoursDeltaText}
              style={{ color: deltaColor(hoursDelta), fontSize: 11 }}
            />
          )}
        </GlassPanel>

        <TextWidget text="" style={{ width: 8 }} />

        {/* Earnings glass panel */}
        <GlassPanel flex={1}>
          <TextWidget
            text={data.earnings}
            style={{ color: '#E8C97A', fontSize: 22, fontWeight: '600' }}
          />
          <TextWidget
            text="earned"
            style={{ color: '#A0A0A0', fontSize: 12 }}
          />
          {/* FR5: earnings delta */}
          {earningsDeltaText.length > 0 && (
            <TextWidget
              text={earningsDeltaText}
              style={{ color: deltaColor(earningsDelta), fontSize: 11 }}
            />
          )}
        </GlassPanel>
      </FlexWidget>

      <TextWidget text="" style={{ height: 8 }} />

      {/* FR4: Pace badge */}
      <PaceBadge paceBadge={data.paceBadge} />

      <TextWidget text="" style={{ height: 6 }} />

      {/* Stats row: Today + AI% */}
      <FlexWidget style={{ flexDirection: 'row' }}>
        <TextWidget
          text={`Today: ${data.today}`}
          style={{ color: '#E0E0E0', fontSize: 13 }}
        />
        <TextWidget text="" style={{ flex: 1 }} />
        <TextWidget
          text={`AI: ${data.aiPct}`}
          style={{ color: '#00C2FF', fontSize: 13 }}
        />
      </FlexWidget>

      {/* Hours remaining */}
      <TextWidget
        text={data.hoursRemaining}
        style={{ color: '#A0A0A0', fontSize: 12 }}
      />

      {/* FR6: BrainLift progress bar */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget
          text="BL"
          style={{ color: '#A78BFA', fontSize: 11 }}
        />
        <SvgWidget
          svg={blProgressBar(brainliftHours, targetHours, 120)}
          style={{ width: 120, height: 6 }}
        />
        <TextWidget
          text={` ${data.brainlift} / ${data.brainliftTarget ?? '5h'}`}
          style={{ color: '#A78BFA', fontSize: 11 }}
        />
      </FlexWidget>

      {/* Stale indicator */}
      {stale && (
        <TextWidget
          text={`Cached: ${formatCachedTime(data.cachedAt)}`}
          style={{ color: '#FF9500', fontSize: 10 }}
        />
      )}

      {/* Manager pending badge (non-urgency) */}
      {data.isManager && data.pendingCount > 0 && (
        <TextWidget
          text={`${data.pendingCount} pending approval`}
          style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}
        />
      )}
    </FlexWidget>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface HourglassWidgetProps {
  data: WidgetData | null;
  widgetFamily?: 'small' | 'medium';
}

export function HourglassWidget({ data, widgetFamily = 'medium' }: HourglassWidgetProps) {
  if (!data) {
    return <FallbackWidget />;
  }

  if (widgetFamily === 'small') {
    return <SmallWidget data={data} />;
  }

  return <MediumWidget data={data} />;
}

export default HourglassWidget;
