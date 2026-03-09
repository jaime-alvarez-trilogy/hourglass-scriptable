// FR5: Android Widget Component (react-native-android-widget)
// Renders widget UI using FlexWidget + TextWidget (supported subset).
// Supports small and medium sizes.
//
// Data is read from AsyncStorage 'widget_data' by the task handler
// and passed here as props for rendering.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetData } from '../types';

// ─── Urgency color mapping ─────────────────────────────────────────────────────

const URGENCY_BG: Record<string, string> = {
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

// ─── Fallback widget ───────────────────────────────────────────────────────────

export function FallbackWidget() {
  return (
    <FlexWidget
      style={{
        backgroundColor: '#1A1A2E',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text="Hourglass"
        style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}
      />
      <TextWidget
        text="Tap to refresh"
        style={{ color: '#AAAAAA', fontSize: 12 }}
      />
    </FlexWidget>
  );
}

// ─── Small widget ──────────────────────────────────────────────────────────────

function SmallWidget({ data }: { data: WidgetData }) {
  const bg = URGENCY_BG[data.urgency] ?? URGENCY_BG.none;
  const accent = URGENCY_ACCENT[data.urgency] ?? URGENCY_ACCENT.none;
  const stale = isStale(data.cachedAt);

  return (
    <FlexWidget
      style={{
        backgroundColor: bg,
        flex: 1,
        flexDirection: 'column',
        padding: 12,
      }}
    >
      {/* Hours total */}
      <TextWidget
        text={data.hoursDisplay}
        style={{ color: accent, fontSize: 28, fontWeight: 'bold' }}
      />

      {/* Earnings */}
      <TextWidget
        text={data.earnings}
        style={{ color: '#FFFFFF', fontSize: 14 }}
      />

      {/* Spacer equivalent: empty text */}
      <TextWidget text="" style={{ flex: 1 }} />

      {/* Hours remaining */}
      <TextWidget
        text={data.hoursRemaining}
        style={{ color: '#AAAAAA', fontSize: 12 }}
      />

      {/* Stale indicator */}
      {stale && (
        <TextWidget
          text={`Cached: ${formatCachedTime(data.cachedAt)}`}
          style={{ color: '#FF9500', fontSize: 10 }}
        />
      )}

      {/* Manager badge */}
      {data.isManager && data.pendingCount > 0 && (
        <TextWidget
          text={`${data.pendingCount} pending`}
          style={{ color: '#FF3B30', fontSize: 11 }}
        />
      )}
    </FlexWidget>
  );
}

// ─── Medium widget ─────────────────────────────────────────────────────────────

function MediumWidget({ data }: { data: WidgetData }) {
  const bg = URGENCY_BG[data.urgency] ?? URGENCY_BG.none;
  const accent = URGENCY_ACCENT[data.urgency] ?? URGENCY_ACCENT.none;
  const stale = isStale(data.cachedAt);

  return (
    <FlexWidget
      style={{
        backgroundColor: bg,
        flex: 1,
        flexDirection: 'column',
        padding: 12,
      }}
    >
      {/* Top row: hero hours + earnings */}
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={data.hoursDisplay}
            style={{ color: accent, fontSize: 32, fontWeight: 'bold' }}
          />
          <TextWidget
            text="this week"
            style={{ color: '#AAAAAA', fontSize: 12 }}
          />
        </FlexWidget>

        <TextWidget text="" style={{ flex: 1 }} />

        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget
            text={data.earnings}
            style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '600' }}
          />
          <TextWidget
            text="earned"
            style={{ color: '#AAAAAA', fontSize: 12 }}
          />
        </FlexWidget>
      </FlexWidget>

      <TextWidget text="" style={{ flex: 1 }} />

      {/* Today + AI% */}
      <FlexWidget style={{ flexDirection: 'row' }}>
        <TextWidget
          text={`Today: ${data.today}`}
          style={{ color: '#DDDDDD', fontSize: 13 }}
        />
        <TextWidget text="" style={{ flex: 1 }} />
        <TextWidget
          text={`AI: ${data.aiPct}`}
          style={{ color: '#DDDDDD', fontSize: 13 }}
        />
      </FlexWidget>

      {/* Hours remaining */}
      <TextWidget
        text={data.hoursRemaining}
        style={{ color: '#AAAAAA', fontSize: 12 }}
      />

      {/* Stale indicator */}
      {stale && (
        <TextWidget
          text={`Cached: ${formatCachedTime(data.cachedAt)}`}
          style={{ color: '#FF9500', fontSize: 10 }}
        />
      )}

      {/* Manager badge */}
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
