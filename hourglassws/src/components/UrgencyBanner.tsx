// FR4: UrgencyBanner — countdown banner with urgency-level color theming
// Returns null when urgency is 'none' (> 12h remaining)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getUrgencyLevel, formatTimeRemaining } from '../lib/hours';
import type { UrgencyLevel } from '../lib/hours';

const URGENCY_COLORS: Record<Exclude<UrgencyLevel, 'none'>, string> = {
  low: '#FFC107',      // yellow
  high: '#FF9500',     // orange
  critical: '#FF3B30', // red
  expired: '#FF3B30',  // red
};

interface UrgencyBannerProps {
  timeRemaining: number; // ms
}

export function UrgencyBanner({ timeRemaining }: UrgencyBannerProps) {
  const level = getUrgencyLevel(timeRemaining);

  if (level === 'none') {
    return null;
  }

  const backgroundColor = URGENCY_COLORS[level];
  const label = formatTimeRemaining(timeRemaining);

  return (
    <View style={[styles.banner, { backgroundColor }]} testID="urgency-banner">
      <Text style={styles.text}>
        {level === 'expired' ? 'Expired' : `Deadline in ${label}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});
