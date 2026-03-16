// FR1 (02-approvals-tab-redesign): Always-visible Requests tab — no role gate.
// Removed: showApprovals conditional, useConfig import, tabBarButton role check.
// Tab title changed from "Approvals" to "Requests".
//
// FR1 (06-wiring-and-tokens): NoiseOverlay wired — wraps Tabs in View, overlay after.
// FR2 (06-wiring-and-tokens): Tab bar uses color tokens (colors.surface / colors.border).

import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import NoiseOverlay from '@/src/components/NoiseOverlay';
import { colors } from '@/src/lib/colors';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: '#E8C97A',   // gold — active tab
          tabBarInactiveTintColor: '#484F58', // textMuted — inactive tab
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: 'Overview',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="ai"
          options={{
            title: 'AI',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Requests',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="checkmark.circle.fill" color={color} />,
          }}
        />
        {/* Hide the old explore tab from navigation */}
        <Tabs.Screen
          name="explore"
          options={{ href: null }}
        />
      </Tabs>
      <NoiseOverlay />
    </View>
  );
}
