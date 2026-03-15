/**
 * Overview tab — synchronized multi-week trend dashboard (07-overview-sync)
 *
 * Features:
 *   - 4W / 12W toggle — slices all metric arrays to last N weeks
 *   - Synchronized scrubbing — touching any chart shows cursor on all 4
 *   - Week snapshot panel — slides in during scrub, shows all 4 metrics for selected week
 *   - Real historical data from useWeeklyHistory + live current-week from useHoursData/useAIData
 *
 * Architecture:
 *   scrubWeekIndex (number | null) lives here. Any chart's onScrubChange sets it.
 *   All 4 TrendSparkline instances receive externalCursorIndex={scrubWeekIndex}.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useConfig } from '@/src/hooks/useConfig';
import { useOverviewData } from '@/src/hooks/useOverviewData';
import { useFocusKey } from '@/src/hooks/useFocusKey';
import { colors } from '@/src/lib/colors';
import { springPremium } from '@/src/lib/reanimated-presets';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import TrendSparkline from '@/src/components/TrendSparkline';
import FadeInScreen from '@/src/components/FadeInScreen';
import type { ScrubChangeCallback } from '@/src/hooks/useScrubGesture';

// ─── Chart section ────────────────────────────────────────────────────────────

interface ChartSectionProps {
  label: string;
  heroValue: string;
  subtitle?: string;
  data: number[];
  color: string;
  maxValue?: number;
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

  const weeklyLimit = config?.weeklyLimit ?? 40;
  const hourlyRate = config?.hourlyRate ?? 0;
  const maxEarnings = hourlyRate * weeklyLimit;

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

  // ── Toggle styles ──────────────────────────────────────────────────────────
  const toggle4Active = window === 4;
  const activePillStyle = {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  };
  const inactivePillStyle = {
    paddingHorizontal: 12,
    paddingVertical: 4,
  };

  return (
    <FadeInScreen>
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
        >
          {/* Header row: title + 4W/12W toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text className="text-textPrimary font-display-bold text-2xl">Overview</Text>
            {/* 4W / 12W segmented control */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.border,
              borderRadius: 10,
              padding: 2,
            }}>
              <TouchableOpacity
                onPress={() => handleWindowChange(4)}
                style={toggle4Active ? activePillStyle : inactivePillStyle}
              >
                <Text style={{
                  color: toggle4Active ? colors.gold : colors.textMuted ?? '#888',
                  fontWeight: toggle4Active ? '600' : '400',
                  fontSize: 13,
                }}>
                  4W
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleWindowChange(12)}
                style={!toggle4Active ? activePillStyle : inactivePillStyle}
              >
                <Text style={{
                  color: !toggle4Active ? colors.gold : colors.textMuted ?? '#888',
                  fontWeight: !toggle4Active ? '600' : '400',
                  fontSize: 13,
                }}>
                  12W
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
                <Text style={{ color: colors.success, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
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

          {/* Earnings chart */}
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

          {/* Hours chart */}
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

          {/* AI% chart */}
          <ChartSection
            label="AI USAGE %"
            heroValue={`${Math.round(heroAiPct)}%`}
            subtitle="Target: 75% of tracked time"
            data={overviewData.aiPct}
            color={colors.cyan}
            maxValue={100}
            showGuide
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`ai-${chartKey}-${window}`}
          />

          {/* BrainLift chart */}
          <ChartSection
            label="BRAINLIFT HOURS"
            heroValue={`${heroBrainlift.toFixed(1)}h`}
            subtitle="Target: 5h / week"
            data={overviewData.brainliftHours}
            color={colors.violet}
            maxValue={5}
            showGuide
            weekLabels={overviewData.weekLabels}
            onScrubChange={setScrubWeekIndex}
            externalCursorIndex={scrubWeekIndex}
            chartKey={`brainlift-${chartKey}-${window}`}
          />
        </ScrollView>
      </SafeAreaView>
    </FadeInScreen>
  );
}
