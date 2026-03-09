// FR4: ApprovalCard — swipeable card for a single approval item

import React, { useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
} from 'react-native'
import type { ApprovalItem, ManualApprovalItem, OvertimeApprovalItem } from '../lib/approvals'

interface Props {
  item: ApprovalItem
  onApprove: () => void
  onReject: () => void
}

const SWIPE_THRESHOLD = 80

export function ApprovalCard({ item, onApprove, onReject }: Props) {
  const translateX = useRef(new Animated.Value(0)).current

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
  const manualItem = isManual ? (item as ManualApprovalItem) : null
  const overtimeItem = !isManual ? (item as OvertimeApprovalItem) : null

  const label = `${item.fullName} — ${item.hours}h — ${item.category}`

  return (
    <View
      style={styles.container}
      accessibilityLabel={label}
    >
      {/* Swipe hint backgrounds */}
      <View style={[styles.actionBg, styles.approveBg]} />
      <View style={[styles.actionBg, styles.rejectBg]} />

      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
        accessibilityLabel={label}
      >
        {/* Header row: name + type badge or cost */}
        <View style={styles.row}>
          <Text style={styles.name}>{item.fullName}</Text>
          {manualItem && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{manualItem.type}</Text>
            </View>
          )}
          {overtimeItem && (
            <Text style={styles.cost}>
              ${overtimeItem.cost.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Hours + description */}
        <View style={styles.row}>
          <Text style={styles.hours}>{item.hours}h</Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        {/* Quick action buttons (accessibility fallback for gesture) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={onApprove}
            accessibilityLabel={`Approve ${item.fullName}`}
          >
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={onReject}
            accessibilityLabel={`Reject ${item.fullName}`}
          >
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  approveBg: {
    left: 0,
    backgroundColor: '#22c55e',
  },
  rejectBg: {
    right: 0,
    backgroundColor: '#ef4444',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  typeBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  cost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  hours: {
    fontSize: 13,
    color: '#555',
    marginRight: 8,
    minWidth: 36,
  },
  description: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#dcfce7',
  },
  rejectBtn: {
    backgroundColor: '#fee2e2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
})
