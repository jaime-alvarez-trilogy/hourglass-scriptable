// OverviewHeroCard.tsx — 03-overview-hero FR1 + FR2
//
// Hero card for the Overview tab. Displays period totals (earnings + hours) with
// an embedded 4W/12W window toggle and an optional current-week overtime badge.
//
// Design system: FEATURE.md "Hero Glass System — Overview hero"
//   Layer 2: Hero Card — uses Card(elevated) as glass base
//   Internal layout: period label + toggle row / dual-metric row (side by side)
//   Earnings: gold (#E8C97A), 28sp bold
//   Hours: textPrimary (#FFFFFF), 28sp bold
//   OT badge: overtimeWhiteGold (#FFF8E7), 13sp — only when overtimeHours > 0
//
// Architecture:
//   - Pure presentational component — no hooks, no data fetching
//   - No StyleSheet.create — inline styles consistent with project convention

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Card from './Card';
import SectionLabel from './SectionLabel';
import { colors } from '@/src/lib/colors';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverviewHeroCardProps {
  /** Sum of earnings[] for the selected window */
  totalEarnings: number;
  /** Sum of hours[] for the selected window */
  totalHours: number;
  /** Current week overtime hours (Math.max(0, hoursData.total - weeklyLimit)) — 0 = no badge */
  overtimeHours: number;
  /** Selected time window */
  window: 4 | 12;
  /** Called when user taps a window toggle button */
  onWindowChange: (w: 4 | 12) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OverviewHeroCard({
  totalEarnings,
  totalHours,
  overtimeHours,
  window,
  onWindowChange,
}: OverviewHeroCardProps): JSX.Element {
  const periodLabel = window === 4 ? 'LAST 4 WEEKS' : 'LAST 12 WEEKS';

  // ── Toggle pill styles ──────────────────────────────────────────────────────
  const activePill = {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  };
  const inactivePill = {
    paddingHorizontal: 12,
    paddingVertical: 4,
  };

  return (
    <Card elevated>
      {/* Header row: period label + 4W/12W toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <SectionLabel className="flex-1">{periodLabel}</SectionLabel>

        {/* 4W/12W segmented toggle */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.border,
          borderRadius: 10,
          padding: 2,
        }}>
          <TouchableOpacity
            onPress={() => onWindowChange(4)}
            style={window === 4 ? activePill : inactivePill}
            activeOpacity={0.7}
          >
            <Text style={{
              color: window === 4 ? colors.violet : colors.textMuted,
              fontWeight: window === 4 ? '600' : '400',
              fontSize: 13,
            }}>
              4W
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onWindowChange(12)}
            style={window === 12 ? activePill : inactivePill}
            activeOpacity={0.7}
          >
            <Text style={{
              color: window === 12 ? colors.violet : colors.textMuted,
              fontWeight: window === 12 ? '600' : '400',
              fontSize: 13,
            }}>
              12W
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics row: earnings (left) + hours (right) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {/* Earnings column */}
        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.gold,
            fontSize: 28,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}>
            {`$${Math.round(totalEarnings).toLocaleString()}`}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
            Total Earnings
          </Text>
        </View>

        {/* Hours column */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{
              color: colors.textPrimary,
              fontSize: 28,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}>
              {`${Math.round(totalHours)}h`}
            </Text>
            {overtimeHours > 0 && (
              <Text style={{
                color: colors.overtimeWhiteGold,
                fontSize: 13,
                fontWeight: '500',
              }}>
                {`+${Math.round(overtimeHours)}h OT`}
              </Text>
            )}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
            Total Hours
          </Text>
        </View>
      </View>
    </Card>
  );
}
