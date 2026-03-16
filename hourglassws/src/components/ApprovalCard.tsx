// FR2: ApprovalCard — swipeable card for a single approval item
// FR6: Type badges — gold pill (MANUAL) and warning pill (OVERTIME)
//
// Gesture: PanResponder retained — Reanimated gesture migration is out of scope
// Visual styles: NativeWind className only (migrated from StyleSheet.create)

import React, { useRef } from 'react'
import {
  View,
  Text,
  Animated,
  PanResponder,
} from 'react-native'
import type { ApprovalItem, ManualApprovalItem, OvertimeApprovalItem } from '../lib/approvals'
import { AnimatedPressable } from './AnimatedPressable'

interface Props {
  item: ApprovalItem
  onApprove: () => void
  onReject: () => void
}

const SWIPE_THRESHOLD = 80

export function ApprovalCard({ item, onApprove, onReject }: Props) {
  const translateX = useRef(new Animated.Value(0)).current

  // Gesture: PanResponder retained — Reanimated gesture migration is out of scope
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          // Swipe right = approve
          Animated.spring(translateX, { toValue: 300, useNativeDriver: true }).start(() => {
            onApprove()
          })
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          // Swipe left = reject
          Animated.spring(translateX, { toValue: -300, useNativeDriver: true }).start(() => {
            onReject()
          })
        } else {
          // Snap back
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  const isManual = item.category === 'MANUAL'
  const overtimeItem = !isManual ? (item as OvertimeApprovalItem) : null

  const label = `${item.fullName} — ${item.hours}h — ${item.category}`

  return (
    <View
      className="relative mx-4 my-1.5 rounded-2xl overflow-hidden"
      accessibilityLabel={label}
    >
      {/* Swipe hint backgrounds */}
      <View className="absolute top-0 bottom-0 left-0 w-1/2 bg-success rounded-l-2xl" />
      <View className="absolute top-0 bottom-0 right-0 w-1/2 bg-destructive rounded-r-2xl" />

      {/* Card content — only style prop for gesture transform */}
      <Animated.View
        className="bg-surface rounded-2xl p-3.5"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
        accessibilityLabel={label}
      >
        {/* Header row: name + type badge */}
        <View className="flex-row items-center mb-1">
          <Text className="flex-1 text-textPrimary text-base font-sans-semibold">
            {item.fullName}
          </Text>

          {/* Manual type badge — violet (interactive accent, not monetary) */}
          {isManual && (
            <View className="bg-violet/20 rounded-full px-2 py-0.5 ml-2">
              <Text className="text-violet text-xs font-sans-medium">Manual</Text>
            </View>
          )}

          {/* FR6: Warning pill badge for overtime */}
          {!isManual && (
            <View className="bg-warning/20 rounded-full px-2 py-0.5 ml-2">
              <Text className="text-warning text-xs font-sans-medium">Overtime</Text>
            </View>
          )}
        </View>

        {/* Hours + description row */}
        <View className="flex-row items-center mb-2">
          <Text className="text-textSecondary text-sm mr-2 min-w-[36px]" style={{ fontVariant: ['tabular-nums'] }}>
            {item.hours}h
          </Text>
          <Text className="flex-1 text-textSecondary text-sm" numberOfLines={2}>
            {item.description}
          </Text>

          {/* FR6: Overtime cost */}
          {overtimeItem && (
            <Text className="text-success text-sm font-sans-semibold ml-2" style={{ fontVariant: ['tabular-nums'] }}>
              ${overtimeItem.cost.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Quick action buttons (accessibility fallback for gesture) */}
        <View className="flex-row gap-2 mt-1">
          <AnimatedPressable
            className="flex-1 py-1.5 rounded-xl bg-violet/20 items-center"
            onPress={onApprove}
            accessibilityLabel={`Approve ${item.fullName}`}
          >
            <Text className="text-violet text-sm font-sans-medium">Approve</Text>
          </AnimatedPressable>
          <AnimatedPressable
            className="flex-1 py-1.5 rounded-xl bg-destructive/20 items-center"
            onPress={onReject}
            accessibilityLabel={`Reject ${item.fullName}`}
          >
            <Text className="text-destructive text-sm font-sans-medium">Reject</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </View>
  )
}
