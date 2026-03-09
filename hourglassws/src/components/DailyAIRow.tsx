// FR9 (04-ai-brainlift): DailyAIRow — single row in daily AI breakdown list

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DailyTagData } from '../lib/ai';

interface DailyAIRowProps {
  item: DailyTagData;
}

/** Formats YYYY-MM-DD as "Mon 3/3" style label */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${dayName} ${month}/${day}`;
}

/** Per-day AI% display: (aiUsage / taggedSlots) * 100, or "—" if no tagged slots */
function formatDayAIPct(item: DailyTagData): string {
  const taggedSlots = item.total - item.noTags;
  if (taggedSlots === 0) return '—';
  const pct = Math.round((item.aiUsage / taggedSlots) * 100);
  return `${pct}%`;
}

export function DailyAIRow({ item }: DailyAIRowProps) {
  const dateLabel = formatDateLabel(item.date);
  const aiPct = formatDayAIPct(item);
  const brainliftDisplay = item.secondBrain > 0 ? `${item.secondBrain} slots` : '—';

  return (
    <View style={[styles.row, item.isToday && styles.todayRow]}>
      <Text style={[styles.dateLabel, item.isToday && styles.todayText]}>
        {dateLabel}
        {item.isToday ? ' (today)' : ''}
      </Text>
      <Text style={styles.metric}>{aiPct}</Text>
      <Text style={styles.metric}>{brainliftDisplay}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  todayRow: {
    backgroundColor: '#1A1A2E',
  },
  dateLabel: {
    flex: 1,
    fontSize: 14,
    color: '#EBEBF5',
  },
  todayText: {
    color: '#00FF88',
    fontWeight: '600',
  },
  metric: {
    width: 70,
    textAlign: 'right',
    fontSize: 14,
    color: '#8E8E93',
  },
});
