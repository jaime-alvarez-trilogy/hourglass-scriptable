// FR9 (04-ai-brainlift): AI & BrainLift screen — rebuilt for 06-ai-tab design system
// FR1: AIRingChart integration (two-ring: AI% outer cyan, BrainLift% inner violet)
// FR2: Hero metric section (MetricValue count-up, SectionLabel, NativeWind tokens)
// FR3: BrainLift progress bar (ProgressBar bg-violet, /5h target subtext)
// FR4: Delta badge (week-over-week AI% from AsyncStorage via useAIData)
// FR5: DailyAIRow (className-only styling)
// FR6: Loading/skeleton states (SkeletonLoader for ring, metrics, breakdown)
// FR1 (03-ai-tab-integration): Prime Radiant card — AIConeChart full-size with re-animation

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAIData } from '@/src/hooks/useAIData';
import { useConfig } from '@/src/hooks/useConfig';
import { useFocusKey } from '@/src/hooks/useFocusKey';
import AIRingChart from '@/src/components/AIRingChart';
import AIConeChart from '@/src/components/AIConeChart';
import FadeInScreen from '@/src/components/FadeInScreen';
import MetricValue from '@/src/components/MetricValue';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import ProgressBar from '@/src/components/ProgressBar';
import SkeletonLoader from '@/src/components/SkeletonLoader';
import { DailyAIRow } from '@/src/components/DailyAIRow';
import { computeAICone } from '@/src/lib/aiCone';
import { colors } from '@/src/lib/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 160;
const BRAINLIFT_TARGET = 5;

// ─── Layout constants ─────────────────────────────────────────────────────────

const CONTENT_STYLE = { padding: 16, paddingTop: 56, gap: 12 } as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIScreen() {
  const router = useRouter();
  const { data, isLoading, lastFetchedAt, error, refetch, previousWeekPercent } = useAIData();
  const { config } = useConfig();
  const chartKey = useFocusKey();

  // Prime Radiant cone dims — measured via onLayout; chart renders null until width > 0
  const [coneDims, setConeDims] = useState({ width: 0, height: 240 });

  // Config-derived weekly limit (FR1 03-ai-tab-integration)
  const weeklyLimit = config?.weeklyLimit ?? 40;

  // Cone data — recomputed when data or weeklyLimit changes
  const coneData = useMemo(
    () => (data ? computeAICone(data.dailyBreakdown, weeklyLimit) : null),
    [data, weeklyLimit],
  );

  // Auth error state
  if (error === 'auth') {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6 gap-3" testID="error-auth">
        <Text className="text-xl font-bold text-textPrimary text-center">Session expired</Text>
        <Text className="text-sm text-textSecondary text-center">Please re-login to continue.</Text>
        <TouchableOpacity
          className="bg-success rounded-xl px-6 py-3 mt-2"
          onPress={() => router.replace('/(auth)/welcome')}
          testID="relogin-button"
        >
          <Text className="text-base font-bold text-background">Re-login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Network error state
  if (error === 'network') {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6 gap-3" testID="error-network">
        <Text className="text-xl font-bold text-textPrimary text-center">No connection</Text>
        <Text className="text-sm text-textSecondary text-center">Pull to refresh when connected.</Text>
        <TouchableOpacity
          className="bg-success rounded-xl px-6 py-3 mt-2"
          onPress={refetch}
          testID="retry-button"
        >
          <Text className="text-base font-bold text-background">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!data && !isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6 gap-3" testID="empty-state">
        <Text className="text-xl font-bold text-textPrimary text-center">No data yet.</Text>
        <Text className="text-sm text-textSecondary text-center">Come back after tracking some hours.</Text>
        <TouchableOpacity
          className="bg-success rounded-xl px-6 py-3 mt-2"
          onPress={refetch}
        >
          <Text className="text-base font-bold text-background">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derive display values from data (or 0 while loading)
  const aiPercent = data ? (data.aiPctLow + data.aiPctHigh) / 2 : 0;
  const brainliftHours = data?.brainliftHours ?? 0;
  const brainliftPercent = Math.min(100, (brainliftHours / BRAINLIFT_TARGET) * 100);

  // Week-over-week delta (FR4) — only computed when we have real data and a prior week reference
  const delta = (data && previousWeekPercent !== undefined) ? aiPercent - previousWeekPercent : null;

  // Skeleton layout: shown only when isLoading=true AND no data yet
  const showSkeleton = isLoading && !data;

  return (
    <FadeInScreen>
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={CONTENT_STYLE}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.success}
        />
      }
    >
      {/* Header */}
      <Text className="text-3xl font-bold text-textPrimary mb-1">AI &amp; BrainLift</Text>

      {/* AI Usage Card — FR1, FR2, FR4 */}
      <Card>
        <SectionLabel>AI USAGE</SectionLabel>

        {showSkeleton ? (
          <View testID="skeleton-ring" className="items-center mt-3">
            <SkeletonLoader width={RING_SIZE} height={RING_SIZE} rounded />
          </View>
        ) : (
          <View className="items-center mt-3">
            {/* Ring container: AIRingChart with MetricValue overlay */}
            <View
              testID="ai-ring-container"
              style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}
            >
              <AIRingChart
                aiPercent={aiPercent}
                brainliftPercent={brainliftPercent}
                size={RING_SIZE}
              />
              {/* MetricValue overlay: centered absolutely over the ring */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MetricValue
                  value={aiPercent}
                  unit="%"
                  precision={0}
                  colorClass="text-cyan"
                  sizeClass="text-4xl"
                />
              </View>
            </View>

            {/* Delta badge — FR4 */}
            {delta !== null && (
              <View
                testID="delta-badge"
                className="bg-surfaceElevated rounded-full px-2 py-0.5 mt-2"
              >
                <Text
                  className={`text-xs font-semibold${
                    delta > 0
                      ? ' text-success'
                      : delta < 0
                      ? ' text-error'
                      : ' text-textSecondary'
                  }`}
                >
                  {delta === 0
                    ? '+0.0%'
                    : delta > 0
                    ? `+${delta.toFixed(1)}%`
                    : `${delta.toFixed(1)}%`}
                </Text>
              </View>
            )}
          </View>
        )}

        {showSkeleton && (
          <View testID="skeleton-metrics" className="mt-3 gap-2">
            <SkeletonLoader height={40} />
            <SkeletonLoader height={32} />
          </View>
        )}

        {/* AI% target note */}
        {!showSkeleton && (
          <Text className="text-xs text-textTertiary text-center mt-2">75% target</Text>
        )}
      </Card>

      {/* BrainLift Card — FR2, FR3 */}
      <Card>
        <SectionLabel>BRAINLIFT</SectionLabel>

        {showSkeleton ? (
          <View className="gap-2 mt-2">
            <SkeletonLoader height={32} />
            <SkeletonLoader height={6} />
          </View>
        ) : (
          <>
            {/* BrainLift hours MetricValue row */}
            <View className="flex-row items-baseline gap-1 mt-2">
              <MetricValue
                value={brainliftHours}
                unit="h"
                precision={1}
                colorClass="text-violet"
                sizeClass="text-3xl"
              />
              <Text className="text-sm text-textSecondary">/ 5h target</Text>
            </View>

            {/* BrainLift progress bar */}
            <ProgressBar
              progress={brainliftHours / BRAINLIFT_TARGET}
              colorClass="bg-violet"
              height={6}
              className="mt-2"
            />

            {/* Subtext */}
            <Text className="text-sm text-textSecondary mt-1">
              {brainliftHours.toFixed(1)}h / {BRAINLIFT_TARGET}h target
            </Text>
          </>
        )}
      </Card>

      {/* Prime Radiant Card — FR1 (03-ai-tab-integration) */}
      <Card>
        <SectionLabel className="mb-3">PRIME RADIANT</SectionLabel>
        {showSkeleton ? (
          <SkeletonLoader height={240} />
        ) : coneData ? (
          <View
            style={{ height: 240 }}
            onLayout={e => setConeDims({ width: e.nativeEvent.layout.width, height: 240 })}
          >
            <AIConeChart
              key={chartKey}
              data={coneData}
              width={coneDims.width}
              height={240}
              size="full"
            />
          </View>
        ) : null}
      </Card>

      {/* Daily Breakdown Card — FR5 */}
      {(data && data.dailyBreakdown.length > 0) && (
        <Card testID="daily-breakdown">
          {/* Column headers */}
          <View className="flex-row pb-1.5 border-b border-border mb-1">
            <Text className="flex-1 text-xs text-textTertiary uppercase tracking-wider">Day</Text>
            <Text className="w-[70px] text-right text-xs text-textTertiary uppercase tracking-wider">AI%</Text>
            <Text className="w-[70px] text-right text-xs text-textTertiary uppercase tracking-wider">BrainLift</Text>
          </View>
          {data.dailyBreakdown.map((day) => (
            <DailyAIRow key={day.date} item={day} />
          ))}
        </Card>
      )}

      {/* Skeleton for daily breakdown — FR6 */}
      {showSkeleton && (
        <Card>
          <View testID="skeleton-breakdown" className="gap-2">
            <SkeletonLoader height={20} />
            <SkeletonLoader height={20} />
            <SkeletonLoader height={20} />
          </View>
        </Card>
      )}

      {/* Legend Card */}
      <Card>
        <Text className="text-sm font-semibold text-textPrimary mb-1">How it&apos;s calculated</Text>
        <Text className="text-sm text-textSecondary leading-5">
          <Text className="text-cyan font-semibold">AI%</Text>
          {'  '}Slots tagged ai_usage or second_brain ÷ tagged slots × 100
        </Text>
        <Text className="text-sm text-textSecondary leading-5 mt-1">
          <Text className="text-violet font-semibold">BrainLift</Text>
          {'  '}Slots tagged second_brain × 10 min
        </Text>
        <Text className="text-xs text-textTertiary mt-2">
          ±2% display range accounts for measurement variation.
        </Text>
      </Card>

      {/* Last fetched timestamp */}
      {lastFetchedAt && (
        <Text className="text-xs text-textTertiary text-center mt-1" testID="last-fetched">
          Updated {new Date(lastFetchedAt).toLocaleTimeString()}
        </Text>
      )}

      {/* TODO: TrendSparkline — deferred to future analytics spec (weeklyHistory not yet in useAIData) */}
    </ScrollView>
    </FadeInScreen>
  );
}
