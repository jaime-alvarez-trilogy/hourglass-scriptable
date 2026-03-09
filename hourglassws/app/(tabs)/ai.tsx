// FR9 (04-ai-brainlift): AI & BrainLift screen
// Shows weekly AI% range, BrainLift hours vs target, daily breakdown, and legend.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAIData } from '@/src/hooks/useAIData';
import { AIProgressBar } from '@/src/components/AIProgressBar';
import { DailyAIRow } from '@/src/components/DailyAIRow';

const AI_TARGET_PCT = 75;
const BRAINLIFT_TARGET_HOURS = 5;

export default function AIScreen() {
  const router = useRouter();
  const { data, isLoading, lastFetchedAt, error, refetch } = useAIData();

  // Auth error state
  if (error === 'auth') {
    return (
      <View style={styles.centered} testID="error-auth">
        <Text style={styles.errorTitle}>Session expired</Text>
        <Text style={styles.errorSubText}>Please re-login to continue.</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.replace('/(auth)/welcome')}
          testID="relogin-button"
        >
          <Text style={styles.actionButtonText}>Re-login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Network error state
  if (error === 'network') {
    return (
      <View style={styles.centered} testID="error-network">
        <Text style={styles.errorTitle}>No connection</Text>
        <Text style={styles.errorSubText}>Pull to refresh when connected.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={refetch} testID="retry-button">
          <Text style={styles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!data && !isLoading) {
    return (
      <View style={styles.centered} testID="empty-state">
        <Text style={styles.emptyText}>No data yet.</Text>
        <Text style={styles.errorSubText}>Come back after tracking some hours.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={refetch}>
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const aiMid = data ? (data.aiPctLow + data.aiPctHigh) / 2 : 0;
  const blProgress = data
    ? Math.min(data.brainliftHours / BRAINLIFT_TARGET_HOURS, 1) * 100
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor="#00FF88"
        />
      }
    >
      {/* Header */}
      <Text style={styles.title}>AI &amp; BrainLift</Text>

      {/* AI% Card */}
      <View style={styles.card} testID="ai-pct-card">
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>AI USAGE</Text>
          <Text style={styles.cardTarget}>75% target</Text>
        </View>
        <Text style={styles.aiPctValue} testID="ai-pct-value">
          {data ? `${data.aiPctLow}%–${data.aiPctHigh}%` : '—%–—%'}
        </Text>
        <View style={styles.progressContainer}>
          <AIProgressBar value={aiMid} targetLine={AI_TARGET_PCT} color="#00FF88" />
        </View>
        <Text style={styles.cardSubtext}>
          {data ? `${data.taggedSlots} tagged slots · ${data.workdaysElapsed} days tracked` : ''}
        </Text>
      </View>

      {/* BrainLift Card */}
      <View style={styles.card} testID="brainlift-card">
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>BRAINLIFT</Text>
          <Text style={styles.cardTarget}>5h / week target</Text>
        </View>
        <Text style={styles.brainliftValue} testID="brainlift-value">
          {data ? `${data.brainliftHours.toFixed(1)}h / ${BRAINLIFT_TARGET_HOURS}h` : '—h / 5h'}
        </Text>
        <View style={styles.progressContainer}>
          <AIProgressBar value={blProgress} color="#F5C842" />
        </View>
      </View>

      {/* Daily Breakdown */}
      {data && data.dailyBreakdown.length > 0 && (
        <View style={styles.card} testID="daily-breakdown">
          {/* Column headers */}
          <View style={styles.breakdownHeader}>
            <Text style={[styles.breakdownHeaderCell, { flex: 1 }]}>Day</Text>
            <Text style={[styles.breakdownHeaderCell, styles.metricHeader]}>AI%</Text>
            <Text style={[styles.breakdownHeaderCell, styles.metricHeader]}>BrainLift</Text>
          </View>
          {data.dailyBreakdown.map((day) => (
            <DailyAIRow key={day.date} item={day} />
          ))}
        </View>
      )}

      {/* Legend */}
      <View style={styles.card} testID="legend">
        <Text style={styles.legendTitle}>How it's calculated</Text>
        <Text style={styles.legendItem}>
          <Text style={styles.legendTag}>AI%</Text>
          {'  '}Slots tagged ai_usage or second_brain ÷ tagged slots × 100
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.legendTag}>BrainLift</Text>
          {'  '}Slots tagged second_brain × 10 min
        </Text>
        <Text style={styles.legendNote}>
          ±2% display range accounts for measurement variation.
        </Text>
      </View>

      {/* Last fetched timestamp */}
      {lastFetchedAt && (
        <Text style={styles.lastFetched} testID="last-fetched">
          Updated {new Date(lastFetchedAt).toLocaleTimeString()}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
    paddingTop: 56,
    gap: 12,
  },
  centered: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTarget: {
    fontSize: 12,
    color: '#8E8E93',
  },
  aiPctValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#00FF88',
  },
  brainliftValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F5C842',
  },
  progressContainer: {
    marginVertical: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#636366',
    marginTop: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3C',
    marginBottom: 4,
  },
  breakdownHeaderCell: {
    fontSize: 11,
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricHeader: {
    width: 70,
    textAlign: 'right',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EBEBF5',
    marginBottom: 4,
  },
  legendItem: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
  },
  legendTag: {
    color: '#00FF88',
    fontWeight: '600',
  },
  legendNote: {
    fontSize: 12,
    color: '#636366',
    marginTop: 4,
  },
  lastFetched: {
    fontSize: 12,
    color: '#636366',
    textAlign: 'center',
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#00FF88',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
