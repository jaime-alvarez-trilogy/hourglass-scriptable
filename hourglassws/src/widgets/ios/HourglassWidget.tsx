// FR4: iOS Widget Component (expo-widgets, SDK 55)
// Built with @expo/ui/swift-ui — compiles to SwiftUI at build time.
// Supports three sizes: systemSmall, systemMedium, systemLarge.
//
// Data is pre-populated via HourglassWidget.updateTimeline() in bridge.ts.
// This file is compiled by the expo-widgets build plugin — never bundled
// into the main app JS bundle.

'widget';

import type { WidgetData } from '../types';

// SwiftUI component imports (expo-widgets JSX subset)
// These are resolved at build time by the expo-widgets plugin
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VStack, HStack, ZStack, Text, Spacer } = require('@expo/ui/swift-ui');

// ─── Urgency color mapping ─────────────────────────────────────────────────────

const PACE_LABELS: Record<string, string> = {
  crushed_it: 'CRUSHED IT',
  on_track:   'ON TRACK',
  behind:     'BEHIND PACE',
  critical:   'CRITICAL',
};

const URGENCY_COLORS: Record<string, string> = {
  none: '#1A1A2E',
  low: '#4A3B00',
  high: '#4A1F00',
  critical: '#4A0000',
  expired: '#2A2A2A',
};

const URGENCY_ACCENT: Record<string, string> = {
  none: '#00FF88',
  low: '#F5C842',
  high: '#FF6B00',
  critical: '#FF2D55',
  expired: '#6B6B6B',
};

// ─── Stale indicator ──────────────────────────────────────────────────────────

function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > 2 * 60 * 60 * 1000;
}

function formatCachedTime(cachedAt: number): string {
  const d = new Date(cachedAt);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ─── Small widget ─────────────────────────────────────────────────────────────
// Shows: weekly hours total, earnings, hours remaining

function SmallWidget({ props }: { props: WidgetData }) {
  const bg = URGENCY_COLORS[props.urgency] ?? URGENCY_COLORS.none;
  const accent = URGENCY_ACCENT[props.urgency] ?? URGENCY_ACCENT.none;

  return (
    <ZStack>
      <VStack
        background={bg}
        padding={12}
      >
        {/* Hours total */}
        <Text
          font={{ size: 28, weight: 'bold' }}
          foregroundStyle={accent}
        >
          {props.hoursDisplay}
        </Text>

        <Spacer />

        {/* Pace status */}
        {PACE_LABELS[props.paceBadge] && (
          <Text
            font={{ size: 12 }}
            foregroundStyle={accent}
          >
            {PACE_LABELS[props.paceBadge]}
          </Text>
        )}

        {/* Stale indicator */}
        {isStale(props.cachedAt) && (
          <Text font={{ size: 10 }} foregroundStyle="#FF9500">
            Cached: {formatCachedTime(props.cachedAt)}
          </Text>
        )}

        {/* Manager badge */}
        {props.isManager && props.pendingCount > 0 && (
          <Text font={{ size: 11 }} foregroundStyle="#FF3B30">
            {props.pendingCount} pending
          </Text>
        )}
      </VStack>
    </ZStack>
  );
}

// ─── Medium widget ─────────────────────────────────────────────────────────────
// Shows: hours (hero) + earnings (hero) + today's hours + AI%

function MediumWidget({ props }: { props: WidgetData }) {
  const bg = URGENCY_COLORS[props.urgency] ?? URGENCY_COLORS.none;
  const accent = URGENCY_ACCENT[props.urgency] ?? URGENCY_ACCENT.none;

  return (
    <ZStack>
      <VStack background={bg} padding={12}>
        {/* Top row: hero hours + earnings */}
        <HStack>
          <VStack>
            <Text font={{ size: 32, weight: 'bold' }} foregroundStyle={accent}>
              {props.hoursDisplay}
            </Text>
            <Text font={{ size: 12 }} foregroundStyle="#AAAAAA">
              this week
            </Text>
          </VStack>

          <Spacer />

          <VStack>
            <Text font={{ size: 24, weight: 'semibold' }} foregroundStyle="#FFFFFF">
              {props.earnings}
            </Text>
            <Text font={{ size: 12 }} foregroundStyle="#AAAAAA">
              earned
            </Text>
          </VStack>
        </HStack>

        <Spacer />

        {/* Bottom row: today + AI% */}
        <HStack>
          <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
            Today: {props.today}
          </Text>
          <Spacer />
          <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
            AI: {props.aiPct}
          </Text>
        </HStack>

        {/* Hours remaining */}
        <Text font={{ size: 12 }} foregroundStyle="#AAAAAA">
          {props.hoursRemaining}
        </Text>

        {/* Stale indicator */}
        {isStale(props.cachedAt) && (
          <Text font={{ size: 10 }} foregroundStyle="#FF9500">
            Cached: {formatCachedTime(props.cachedAt)}
          </Text>
        )}

        {/* Manager badge */}
        {props.isManager && props.pendingCount > 0 && (
          <Text font={{ size: 11 }} foregroundStyle="#FF3B30">
            {props.pendingCount} pending approval
          </Text>
        )}
      </VStack>
    </ZStack>
  );
}

// ─── Large widget ──────────────────────────────────────────────────────────────
// Shows: all of medium + BrainLift hours

function LargeWidget({ props }: { props: WidgetData }) {
  const bg = URGENCY_COLORS[props.urgency] ?? URGENCY_COLORS.none;
  const accent = URGENCY_ACCENT[props.urgency] ?? URGENCY_ACCENT.none;

  return (
    <ZStack>
      <VStack background={bg} padding={16}>
        {/* Hero row */}
        <HStack>
          <VStack>
            <Text font={{ size: 36, weight: 'bold' }} foregroundStyle={accent}>
              {props.hoursDisplay}
            </Text>
            <Text font={{ size: 12 }} foregroundStyle="#AAAAAA">
              this week
            </Text>
          </VStack>
          <Spacer />
          <VStack>
            <Text font={{ size: 26, weight: 'semibold' }} foregroundStyle="#FFFFFF">
              {props.earnings}
            </Text>
            <Text font={{ size: 12 }} foregroundStyle="#AAAAAA">
              earned
            </Text>
          </VStack>
        </HStack>

        <Spacer />

        {/* Today + delta vs daily average */}
        <HStack>
          <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
            Today: {props.today}
          </Text>
          <Spacer />
          {props.todayDelta && (
            <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
              {props.todayDelta}
            </Text>
          )}
        </HStack>

        {/* AI% */}
        <HStack>
          <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
            AI usage: {props.aiPct}
          </Text>
          <Spacer />
          <Text font={{ size: 13 }} foregroundStyle="#DDDDDD">
            BrainLift: {props.brainlift}
          </Text>
        </HStack>

        <Spacer />

        {/* Manager badge */}
        {props.isManager && props.pendingCount > 0 && (
          <HStack>
            <Text font={{ size: 13, weight: 'semibold' }} foregroundStyle="#FF3B30">
              {props.pendingCount} pending approval{props.pendingCount > 1 ? 's' : ''}
            </Text>
          </HStack>
        )}

        {/* Stale indicator */}
        {isStale(props.cachedAt) && (
          <Text font={{ size: 10 }} foregroundStyle="#FF9500">
            Cached: {formatCachedTime(props.cachedAt)}
          </Text>
        )}
      </VStack>
    </ZStack>
  );
}

// ─── Main widget ───────────────────────────────────────────────────────────────

// createWidget is provided by expo-widgets at build time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createWidget } = require('expo-widgets');

const HourglassWidget = createWidget('HourglassWidget', (props: WidgetData & { widgetFamily?: string }) => {
  'widget';

  const family = props.widgetFamily ?? 'systemMedium';

  if (family === 'systemSmall') {
    return <SmallWidget props={props} />;
  }

  if (family === 'systemLarge') {
    return <LargeWidget props={props} />;
  }

  // Default: medium
  return <MediumWidget props={props} />;
});

export default HourglassWidget;
