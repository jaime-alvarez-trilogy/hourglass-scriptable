// FR4: DailyBarChart — Mon–Sun bar chart with proportional heights
// Custom View-based chart. No external chart library.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DailyEntry } from '../lib/hours';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ACCENT_COLOR = '#00FF88';
const PAST_COLOR = '#48484A';
const FUTURE_COLOR = '#2C2C2E';
const BAR_MAX_HEIGHT = 64;

interface DailyBarChartProps {
  daily: DailyEntry[];
  weeklyLimit: number;
}

export function DailyBarChart({ daily, weeklyLimit }: DailyBarChartProps) {
  if (daily.length === 0) {
    return (
      <View style={styles.container}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.column} testID="bar-column">
            <Text style={styles.hoursLabel}>–</Text>
            <View style={[styles.bar, { height: 4, backgroundColor: FUTURE_COLOR }]} />
            <Text style={styles.dayLabel}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Proportional bar heights based on max hours this week
  const maxHours = Math.max(...daily.map((d) => d.hours), weeklyLimit / 5);

  // Determine which entries are in the future (after today)
  let foundToday = false;

  return (
    <View style={styles.container}>
      {daily.map((entry, i) => {
        const isFuture = !entry.isToday && !foundToday ? false : !entry.isToday;
        if (entry.isToday) foundToday = true;

        const barHeight = entry.hours > 0
          ? Math.max(4, (entry.hours / maxHours) * BAR_MAX_HEIGHT)
          : 4;

        const barColor = entry.isToday
          ? ACCENT_COLOR
          : isFuture
          ? FUTURE_COLOR
          : PAST_COLOR;

        return (
          <View key={i} style={styles.column} testID="bar-column">
            <Text style={styles.hoursLabel}>
              {entry.hours > 0 ? String(entry.hours) : '–'}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.bar, { height: barHeight, backgroundColor: barColor }]}
                testID={entry.isToday ? 'bar-today' : undefined}
              />
            </View>
            <Text style={[styles.dayLabel, entry.isToday && styles.dayLabelToday]}>
              {DAY_LABELS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  column: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: 20,
  },
  bar: {
    width: 16,
    borderRadius: 4,
    minHeight: 4,
  },
  hoursLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  dayLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  dayLabelToday: {
    color: '#00FF88',
    fontWeight: '700',
  },
});
