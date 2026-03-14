/**
 * Overview tab — multi-week trend dashboard
 *
 * Shows 4-week historical trends using available data:
 *   - Earnings trend — from payments API (real data)
 *   - Hours trend    — derived from earnings ÷ hourlyRate (approximate)
 *   - AI % this week — from current week's work diary cache
 *   - BrainLift hrs  — from current week's work diary cache
 */

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfig } from '@/src/hooks/useConfig';
import { useEarningsHistory } from '@/src/hooks/useEarningsHistory';
import { useAIData } from '@/src/hooks/useAIData';
import { colors } from '@/src/lib/colors';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import TrendSparkline from '@/src/components/TrendSparkline';

// ─── Mini sparkline card ─────────────────────────────────────────────────────

interface TrendCardProps {
  label: string;
  value: string;
  subtitle?: string;
  data: number[];
  color: string;
  maxValue?: number;
  showGuide?: boolean;
}

function TrendCard({ label, value, subtitle, data, color, maxValue, showGuide }: TrendCardProps) {
  const [dims, setDims] = useState({ width: 0, height: 52 });

  return (
    <Card>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      <Text style={{ color, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
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
          data={data}
          width={dims.width}
          height={dims.height}
          color={color}
          maxValue={maxValue}
          showGuide={showGuide}
        />
      </View>
      <Text className="text-textMuted text-xs font-sans mt-1 text-right">4-week trend</Text>
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OverviewScreen() {
  const { config } = useConfig();
  const { trend: earningsTrend } = useEarningsHistory();
  const { data: aiData } = useAIData();

  const hourlyRate = config?.hourlyRate ?? 0;
  const weeklyLimit = config?.weeklyLimit ?? 40;
  const maxEarnings = hourlyRate * weeklyLimit;

  // Hours — derived from earnings ÷ rate (approximate, same scale)
  const hoursTrend = hourlyRate > 0
    ? earningsTrend.map(e => parseFloat((e / hourlyRate).toFixed(1)))
    : earningsTrend.map(() => 0);

  // Current week AI stats
  const aiPct = aiData ? Math.round((aiData.aiPctLow + aiData.aiPctHigh) / 2) : null;
  const brainliftHrs = aiData ? aiData.brainliftHours : null;

  // Current week earnings (last item in trend = most recent week)
  const thisWeekEarnings = earningsTrend[earningsTrend.length - 1] ?? 0;
  const thisWeekHours = hoursTrend[hoursTrend.length - 1] ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
      >
        {/* Header */}
        <Text className="text-textPrimary font-display-bold text-2xl mb-2">Overview</Text>

        {/* Earnings trend */}
        <TrendCard
          label="WEEKLY EARNINGS"
          value={`$${Math.round(thisWeekEarnings).toLocaleString()}`}
          subtitle={`Max $${Math.round(maxEarnings).toLocaleString()} / week`}
          data={earningsTrend}
          color={colors.gold}
          maxValue={maxEarnings > 0 ? maxEarnings : undefined}
          showGuide={maxEarnings > 0}
        />

        {/* Hours trend (derived) */}
        <TrendCard
          label="WEEKLY HOURS"
          value={`${thisWeekHours}h`}
          subtitle={`Goal: ${weeklyLimit}h / week`}
          data={hoursTrend}
          color={colors.success}
          maxValue={weeklyLimit > 0 ? weeklyLimit : undefined}
          showGuide={weeklyLimit > 0}
        />

        {/* AI % this week */}
        <Card>
          <SectionLabel className="mb-2">AI USAGE THIS WEEK</SectionLabel>
          {aiPct !== null ? (
            <>
              <Text style={{ color: colors.cyan, fontSize: 28, fontWeight: '700' }}>
                {aiPct}%
              </Text>
              <Text className="text-textSecondary text-xs font-sans mt-0.5">
                Target: 75% of tracked time
              </Text>
            </>
          ) : (
            <Text className="text-textMuted text-sm font-sans">Loading…</Text>
          )}
        </Card>

        {/* BrainLift this week */}
        <Card>
          <SectionLabel className="mb-2">BRAINLIFT THIS WEEK</SectionLabel>
          {brainliftHrs !== null ? (
            <>
              <Text style={{ color: colors.violet, fontSize: 28, fontWeight: '700' }}>
                {brainliftHrs?.toFixed(1)}h
              </Text>
              <Text className="text-textSecondary text-xs font-sans mt-0.5">
                Target: 5h / week
              </Text>
            </>
          ) : (
            <Text className="text-textMuted text-sm font-sans">Loading…</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
