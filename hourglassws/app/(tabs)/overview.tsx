/**
 * Overview tab — synchronized multi-week trend dashboard (07-overview-sync)
 * Updated: 03-overview-hero — hero card + ambient layer wiring
 *
 * Features:
 *   - 4W / 12W toggle — slices all metric arrays to last N weeks (now in OverviewHeroCard)
 *   - Synchronized scrubbing — touching any chart shows cursor on all 4
 *   - Week snapshot panel — slides in during scrub, shows all 4 metrics for selected week
 *   - Real historical data from useWeeklyHistory + live current-week from useHoursData/useAIData
 *   - AmbientBackground: full-screen colored gradient driven by earnings pace signal
 *   - OverviewHeroCard: hero card with period totals (earnings + hours) + overtime badge
 *
 * Architecture:
 *   scrubWeekIndex (number | null) lives here. Any chart's onScrubChange sets it.
 *   All 4 TrendSparkline instances receive externalCursorIndex={scrubWeekIndex}.
 *   AmbientBackground sits absolute inside SafeAreaView, outside ScrollView.
 *   OverviewHeroCard is the first content item; replaces the old standalone toggle row.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useConfig } from '@/src/hooks/useConfig';
import { useOverviewData } from '@/src/hooks/useOverviewData';
import { useHoursData } from '@/src/hooks/useHoursData';
import { useFocusKey } from '@/src/hooks/useFocusKey';
import { useEarningsHistory } from '@/src/hooks/useEarningsHistory';
import { colors } from '@/src/lib/colors';
import { springPremium } from '@/src/lib/reanimated-presets';
import { useStaggeredEntry } from '@/src/hooks/useStaggeredEntry';
import AmbientBackground, { getAmbientColor } from '@/src/components/AmbientBackground';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import TrendSparkline from '@/src/components/TrendSparkline';
import FadeInScreen from '@/src/components/FadeInScreen';
import OverviewHeroCard from '@/src/components/OverviewHeroCard';
import { computeEarningsPace } from '@/src/lib/overviewUtils';
import type { ScrubChangeCallback } from '@/src/hooks/useScrubGesture';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a status-aware colour for a weekly hours snapshot value.
 * Gold is reserved for earnings; this uses the status tokens (success/warning/critical).
 *
 * Thresholds (01-color-semantics spec):
 *   >= 85% of weeklyLimit → success (on-track)
 *   60–84%                → warning (behind pace)
 *   < 60%                 → critical (significantly behind)
 *
 * Edge cases:
 *   weeklyLimit === 0 → success (no target configured)
 *   hours > weeklyLimit  → success (overtime counts as on-track)
 */
export function computeSnapshotHoursColor(hours: number, weeklyLimit: number): string {
  if (weeklyLimit === 0) return colors.success;
  const ratio = hours / weeklyLimit;
  if (ratio >= 0.85) return colors.success;
  if (ratio >= 0.60) return colors.warning;
  return colors.critical;
}

// ─── Chart section ────────────────────────────────────────────────────────────

interface ChartSectionProps {
  label: string;
  heroValue: string;
  subtitle?: string;
  data: number[];
  color: string;
  maxValue?: number;
  targetValue?: number;
  showGuide?: boolean;
  weekLabels?: string[];
  onScrubChange: ScrubChangeCallback;
  externalCursorIndex: number | null;
  chartKey: string;
}

function ChartSection({
  label,
  heroValue,
  subtitle,
  data,
  color,
  maxValue,
  targetValue,
  showGuide,
  weekLabels,
  onScrubChange,
  externalCursorIndex,
  chartKey,
}: ChartSectionProps) {
  const [dims, setDims] = useState({ width: 0, height: 52 });

  return (
    <Card>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      <Text style={{ color, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {heroValue}
      </Text>
      {subtitle ? (
        <Text className="text-textSecondary text-xs font-sans mt-0.5">{subtitle}</Text>
      ) : null}
      <View
        style={{ height: 52 }}
        onLayout={e => setDims({ width: e.nativeEvent.layout.width, height: 52 })}
        className="mt-3"
      >
        <TrendSparkline
          key={chartKey}
          data={data}
          width={dims.width}
          height={dims.height}
          color={color}
          maxValue={maxValue}
          targetValue={targetValue}
          showGuide={showGuide}
          weekLabels={weekLabels}
          onScrubChange={onScrubChange}
          externalCursorIndex={externalCursorIndex}
        />
      </View>
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OverviewScreen() {
  const chartKey = useFocusKey();
  const { config } = useConfig();
  const { getEntryStyle } = useStaggeredEntry({ count: 4 });

  // Ensure earnings/hours history is populated even if home tab hasn't run yet
  useEarningsHistory(12);

  // ── Time window ────────────────────────────────────────────────────────────
  const [window, setWindow] = useState<4 | 12>(4);

  // ── Synchronized scrub state ───────────────────────────────────────────────
  const [scrubWeekIndex, setScrubWeekIndex] = useState<number | null>(null);

  // Reset scrub when window changes (avoids stale index)
  const handleWindowChange = (newWindow: 4 | 12) => {
    setScrubWeekIndex(null);
    setWindow(newWindow);
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: overviewData } = useOverviewData(window);
  const { data: hoursData } = useHoursData();

  const weeklyLimit = config?.weeklyLimit ?? 40;
  const hourlyRate = config?.hourlyRate ?? 0;
  const maxEarnings = hourlyRate * weeklyLimit;

  // ── Hero card props ─────────────────────────────────────────────────────────
  // FR5: period totals for the selected window
  const totalEarnings = overviewData.earnings.reduce((s, v) => s + v, 0);
  const totalHours = overviewData.hours.reduce((s, v) => s + v, 0);
  // FR2: current-week overtime only (historical not available in snapshots)
  const overtimeHours = Math.max(0, (hoursData?.total ?? 0) - (config?.weeklyLimit ?? 0));

  // ── Ambient color ───────────────────────────────────────────────────────────
  // FR4: earnings pace ratio → ambient signal → color
  const earningsPace = overviewData.earnings.length > 0
    ? computeEarningsPace(overviewData.earnings)
    : null;
  const ambientColor = earningsPace !== null
    ? getAmbientColor({ type: 'earningsPace', ratio: earningsPace })
    : null;

  // ── Snapshot panel animation ───────────────────────────────────────────────
  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(8);

  useEffect(() => {
    if (scrubWeekIndex !== null) {
      panelOpacity.value = withSpring(1, springPremium);
      panelTranslateY.value = withSpring(0, springPremium);
    } else {
      panelOpacity.value = withSpring(0, springPremium);
      panelTranslateY.value = withSpring(8, springPremium);
    }
  }, [scrubWeekIndex]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));

  // ── Hero value helpers ─────────────────────────────────────────────────────
  const lastIdx = overviewData.earnings.length - 1;

  const heroEarnings = scrubWeekIndex !== null
    ? overviewData.earnings[scrubWeekIndex] ?? 0
    : overviewData.earnings[lastIdx] ?? 0;

  const heroHours = scrubWeekIndex !== null
    ? overviewData.hours[scrubWeekIndex] ?? 0
    : overviewData.hours[lastIdx] ?? 0;

  const heroAiPct = scrubWeekIndex !== null
    ? overviewData.aiPct[scrubWeekIndex] ?? 0
    : overviewData.aiPct[lastIdx] ?? 0;

  const heroBrainlift = scrubWeekIndex !== null
    ? overviewData.brainliftHours[scrubWeekIndex] ?? 0
    : overviewData.brainliftHours[lastIdx] ?? 0;

  // Snapshot panel content
  const snapLabel = scrubWeekIndex !== null
    ? `Week of ${overviewData.weekLabels[scrubWeekIndex] ?? ''}`
    : '';

  return (
    <FadeInScreen>
      <SafeAreaView className="flex-1 bg-background">
        {/* Layer 1: ambient field — absolute, full-screen, behind all content */}
        <AmbientBackground color={ambientColor} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
        >
          {/* Hero card — period totals + window toggle (replaces standalone header) */}
          <OverviewHeroCard
            totalEarnings={totalEarnings}
            totalHours={totalHours}
            overtimeHours={overtimeHours}
            window={window}
            onWindowChange={handleWindowChange}
          />

          {/* Week snapshot panel — always rendered, animated opacity/translateY */}
          <Animated.View
            style={[panelStyle, {
              backgroundColor: colors.surfaceElevated,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginBottom: 4,
            }]}
            pointerEvents={scrubWeekIndex !== null ? 'auto' : 'none'}
          >
            <Text style={{ color: colors.textMuted ?? '#888', fontSize: 11, marginBottom: 6 }}>
              {snapLabel}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {`$${Math.round(heroEarnings).toLocaleString()}`}
                </Text>
                <Text style={{ color: colors.textMuted ?? '#888', fontSize: 10, marginTop: 2 }}>Earnings</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: computeSnapshotHoursColor(heroHours, weeklyLimit), fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {`${heroHours.toFixed(1)}h`}
                </Text>
                <Text style={{ color: colors.textMuted ?? '#888', fontSize: 10, marginTop: 2 }}>Hours</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {`${Math.round(heroAiPct)}%`}
                </Text>
                <Text style={{ color: colors.textMuted ?? '#888', fontSize: 10, marginTop: 2 }}>AI%</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.violet, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {`${heroBrainlift.toFixed(1)}h`}
                </Text>
                <Text style={{ color: colors.textMuted ?? '#888', fontSize: 10, marginTop: 2 }}>BrainLift</Text>
              </View>
            </View>
          </Animated.View>

          {/* Earnings chart — target = max weekly earnings (hourlyRate × weeklyLimit) */}
          <Animated.View style={getEntryStyle(0)}>
          <ChartSection
            label="WEEKLY EARNINGS"
            heroValue={`$${Math.round(heroEarnings).toLocaleString()}`}
            subtitle={maxEarnings > 0 ? `Max $${Math.round(maxEarnings).toLocaleString()} / week` : undefined}
            data={overviewData.earnings}
            color={colors.gold}
            maxValue={maxEarnings > 0 ? maxEarnings : undefined}
            showGuide={maxEarnings > 0}
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`earnings-${chartKey}-${window}`}
          />
          </Animated.View>

          {/* Hours chart — target = weeklyLimit */}
          <Animated.View style={getEntryStyle(1)}>
          <ChartSection
            label="WEEKLY HOURS"
            heroValue={`${heroHours.toFixed(1)}h`}
            subtitle={`Goal: ${weeklyLimit}h / week`}
            data={overviewData.hours}
            color={colors.success}
            maxValue={weeklyLimit > 0 ? weeklyLimit : undefined}
            showGuide={weeklyLimit > 0}
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`hours-${chartKey}-${window}`}
          />
          </Animated.View>

          {/* AI% chart — target = 75% (scale to 100, guide at 75) */}
          <Animated.View style={getEntryStyle(2)}>
          <ChartSection
            label="AI USAGE %"
            heroValue={`${Math.round(heroAiPct)}%`}
            subtitle="Target: 75% of tracked time"
            data={overviewData.aiPct}
            color={colors.cyan}
            maxValue={100}
            targetValue={75}
            showGuide
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`ai-${chartKey}-${window}`}
          />
          </Animated.View>

          {/* BrainLift chart — target = 5h (scale ceiling = target) */}
          <Animated.View style={getEntryStyle(3)}>
          <ChartSection
            label="BRAINLIFT HOURS"
            heroValue={`${heroBrainlift.toFixed(1)}h`}
            subtitle="Target: 5h / week"
            data={overviewData.brainliftHours}
            color={colors.violet}
            showGuide
            targetValue={5}
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`brainlift-${chartKey}-${window}`}
          />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </FadeInScreen>
  );
}
