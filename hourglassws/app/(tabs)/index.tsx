// FR3-FR6 (05-hours-dashboard): Hours Dashboard — rebuilt with design system
//
// 3-zone layout:
//   Zone 1 — Hero Panel (PanelGradient, MetricValue, StateBadge, sub-metrics)
//   Zone 2 — Weekly Chart (Card, WeeklyBarChart, day labels)
//   Zone 3 — Earnings (Card, MetricValue, TrendSparkline)
//   Footer  — UrgencyBanner (shown when urgency >= low)
//
// No StyleSheet. No hardcoded hex values.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useConfig } from '@/src/hooks/useConfig';
import { useHoursData } from '@/src/hooks/useHoursData';
import { useEarningsHistory } from '@/src/hooks/useEarningsHistory';
import { useFocusKey } from '@/src/hooks/useFocusKey';
import { computePanelState, computeDaysElapsed } from '@/src/lib/panelState';
import { getUrgencyLevel } from '@/src/lib/hours';
import { colors } from '@/src/lib/colors';
import FadeInScreen from '@/src/components/FadeInScreen';
import PanelGradient from '@/src/components/PanelGradient';
import MetricValue from '@/src/components/MetricValue';
import WeeklyBarChart from '@/src/components/WeeklyBarChart';
import TrendSparkline from '@/src/components/TrendSparkline';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import SkeletonLoader from '@/src/components/SkeletonLoader';
import { UrgencyBanner } from '@/src/components/UrgencyBanner';
import type { PanelState } from '@/src/lib/panelState';
import type { DailyHours } from '@/src/components/WeeklyBarChart';
import type { DailyEntry } from '@/src/lib/hours';

// ─── State badge ─────────────────────────────────────────────────────────────

const STATE_LABELS: Record<PanelState, string> = {
  onTrack: 'ON TRACK',
  behind: 'BEHIND',
  critical: 'CRITICAL',
  crushedIt: 'CRUSHED IT',
  idle: 'GETTING STARTED',
};

const STATE_COLORS: Record<PanelState, string> = {
  onTrack: 'text-success',
  behind: 'text-warning',
  critical: 'text-critical',
  crushedIt: 'text-gold',
  idle: 'text-textSecondary',
};

function StateBadge({ state }: { state: PanelState }) {
  return (
    <Text
      className={`font-sans-semibold text-xs tracking-widest ${STATE_COLORS[state]}`}
      testID="state-badge"
    >
      {STATE_LABELS[state]}
    </Text>
  );
}

// ─── Sub-metric item ──────────────────────────────────────────────────────────

function SubMetric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-textSecondary font-sans text-xs uppercase tracking-widest mb-1">
        {label}
      </Text>
      <Text className="text-textPrimary font-display text-lg">
        {value.toFixed(1)}{unit}
      </Text>
    </View>
  );
}

// ─── Map DailyEntry[] → DailyHours[7] ────────────────────────────────────────

function mapDailyToChartData(daily: DailyEntry[]): DailyHours[] {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return DAYS.map((day, index) => {
    // index 0=Mon, 1=Tue, ..., 6=Sun
    // DailyEntry.date is YYYY-MM-DD; parse at noon to avoid DST edge
    const entry = daily.find(e => {
      const d = new Date(e.date + 'T12:00:00');
      const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const normalised = dow === 0 ? 6 : dow - 1; // Mon=0, ..., Sun=6
      return normalised === index;
    });
    return {
      day,
      hours: entry?.hours ?? 0,
      isToday: entry?.isToday ?? false,
      isFuture: !entry || (!entry.isToday && entry.hours === 0),
    };
  });
}

// ─── Cached-at formatter ──────────────────────────────────────────────────────

function formatCachedAt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HoursDashboard() {
  const router = useRouter();
  const { config } = useConfig();
  const { data, isLoading, isStale, cachedAt, error, refetch } = useHoursData();
  const { trend: earningsHistoryTrend } = useEarningsHistory();

  // Layout dimensions for chart and sparkline (measured via onLayout)
  const [chartDims, setChartDims] = useState({ width: 0, height: 0 });
  const [sparklineDims, setSparklineDims] = useState({ width: 0, height: 0 });

  const chartKey = useFocusKey();

  const weeklyLimit = config?.weeklyLimit ?? 40;
  const daysElapsed = computeDaysElapsed();
  const panelState = computePanelState(data?.total ?? 0, weeklyLimit, daysElapsed);
  const urgencyLevel = data ? getUrgencyLevel(data.timeRemaining) : 'none';

  const earningsTrend = earningsHistoryTrend;
  const dailyChartData: DailyHours[] = mapDailyToChartData(data?.daily ?? []);

  return (
    <FadeInScreen>
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!data}
            onRefresh={refetch}
            tintColor={colors.success}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-textPrimary font-display-bold text-2xl">Hourglass</Text>
            {config?.useQA && (
              <View
                className="bg-warning rounded-lg px-1.5 py-0.5"
                testID="qa-badge"
              >
                <Text className="text-background font-sans-bold text-xs">QA</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push('/modal')}
            testID="settings-button"
          >
            <Text className="text-textSecondary text-2xl">⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ── Zone 1: Hero Panel ────────────────────────────────────────── */}
        <PanelGradient state={panelState} className="rounded-2xl">
          <View className="p-6">
            <SectionLabel className="mb-1">THIS WEEK</SectionLabel>

            {isLoading && !data ? (
              /* Loading skeletons for hero zone */
              <View className="gap-3">
                <SkeletonLoader height={56} />
                <SkeletonLoader height={20} width="60%" />
                <SkeletonLoader height={36} />
              </View>
            ) : (
              <>
                <MetricValue
                  value={data?.total ?? 0}
                  unit="h"
                  sizeClass="text-5xl"
                  colorClass="text-textPrimary"
                />
                <Text className="text-textSecondary text-sm font-sans mb-4">
                  of {weeklyLimit}h goal
                </Text>
                <StateBadge state={panelState} />
                {/* Sub-metrics row */}
                <View className="flex-row mt-4">
                  <SubMetric label="Today" value={data?.today ?? 0} unit="h" />
                  <SubMetric label="Avg/day" value={data?.average ?? 0} unit="h" />
                  <SubMetric label="Remaining" value={data?.hoursRemaining ?? 0} unit="h" />
                </View>
              </>
            )}
          </View>
        </PanelGradient>

        {/* ── Error banner (no data + error) ───────────────────────────── */}
        {error && !data && (
          <View
            className="bg-surface border border-critical rounded-2xl p-4"
            testID="error-banner"
          >
            <Text className="text-critical font-sans-semibold text-sm">
              Failed to load hours data
            </Text>
            <Text className="text-textSecondary text-xs mt-1">{error}</Text>
            <TouchableOpacity
              onPress={refetch}
              className="mt-2"
              testID="retry-button"
            >
              <Text className="text-textPrimary font-sans-semibold text-sm">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Zone 2: Weekly Chart ──────────────────────────────────────── */}
        <Card>
          <SectionLabel className="mb-3">THIS WEEK</SectionLabel>

          {isLoading && !data ? (
            <SkeletonLoader height={120} />
          ) : (
            <View
              style={{ height: 120 }}
              onLayout={e => setChartDims({ width: e.nativeEvent.layout.width, height: 120 })}
            >
              <WeeklyBarChart
                key={chartKey}
                data={dailyChartData}
                width={chartDims.width}
                height={120}
                maxHours={Math.max(8, weeklyLimit / 5)}
              />
            </View>
          )}

          {/* Day labels */}
          <View className="flex-row mt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <Text
                key={day}
                className="flex-1 text-center text-textMuted text-xs font-sans"
              >
                {day}
              </Text>
            ))}
          </View>
        </Card>

        {/* ── Zone 3: Earnings ─────────────────────────────────────────── */}
        <Card>
          <SectionLabel className="mb-2">EARNINGS</SectionLabel>

          {isLoading && !data ? (
            <View className="gap-3">
              <SkeletonLoader height={40} />
              <SkeletonLoader height={60} />
            </View>
          ) : (
            <>
              {/* Weekly earnings hero: "$" prefix + animated number */}
              <View className="flex-row items-baseline gap-1">
                <Text className="text-gold font-display-bold text-3xl">$</Text>
                <MetricValue
                  value={data?.weeklyEarnings ?? 0}
                  unit=""
                  precision={0}
                  sizeClass="text-3xl"
                  colorClass="text-gold"
                />
              </View>
              <Text className="text-textSecondary text-sm font-sans mt-1">
                Today: ${Math.round(data?.todayEarnings ?? 0).toLocaleString()}
              </Text>
              {/* 4-week trend sparkline — scaled to max possible earnings */}
              <View
                style={{ height: 60 }}
                onLayout={e => setSparklineDims({ width: e.nativeEvent.layout.width, height: 60 })}
                className="mt-3"
              >
                <TrendSparkline
                  key={chartKey}
                  data={earningsTrend}
                  width={sparklineDims.width}
                  height={sparklineDims.height}
                  color={colors.gold}
                  maxValue={(config?.hourlyRate ?? 0) * (config?.weeklyLimit ?? 40)}
                  showGuide
                />
              </View>
            </>
          )}
        </Card>

        {/* ── Footer: UrgencyBanner ─────────────────────────────────────── */}
        {urgencyLevel !== 'none' && data && (
          <UrgencyBanner timeRemaining={data.timeRemaining} />
        )}

        {/* ── Stale cache indicator ─────────────────────────────────────── */}
        {isStale && cachedAt && (
          <Text className="text-warning text-xs text-center mt-2">
            Cached: {formatCachedAt(cachedAt)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
    </FadeInScreen>
  );
}
