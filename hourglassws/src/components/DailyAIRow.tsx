// FR9 (04-ai-brainlift): DailyAIRow — single row in daily AI breakdown list
// FR5 (06-ai-tab): Migrated from StyleSheet.create() to NativeWind className.

import React from 'react';
import { View, Text } from 'react-native';
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
    <View
      className={`flex-row items-center py-2.5 px-1 border-b border-border${item.isToday ? ' bg-surface' : ''}`}
    >
      <Text
        className={`flex-1 text-sm${item.isToday ? ' text-success font-semibold' : ' text-textPrimary'}`}
      >
        {dateLabel}
        {item.isToday ? ' (today)' : ''}
      </Text>
      <Text className="w-[70px] text-right text-sm text-textSecondary">
        {aiPct}
      </Text>
      <Text className="w-[70px] text-right text-sm text-textSecondary">
        {brainliftDisplay}
      </Text>
    </View>
  );
}
