// FR4: StatCard — reusable metric card (label + value + optional subtitle)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  testID?: string;
}

export function StatCard({ label, value, subtitle, testID }: StatCardProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle !== undefined && (
        <Text style={styles.subtitle} testID={testID ? `${testID}-subtitle` : undefined}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    minWidth: 100,
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
});
