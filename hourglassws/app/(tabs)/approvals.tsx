// FR6: Manager Approvals Screen
// Role-guarded: contributors are redirected to the hours tab on mount.

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useConfig } from '@/src/hooks/useConfig'
import { useApprovalItems } from '@/src/hooks/useApprovalItems'
import { ApprovalCard } from '@/src/components/ApprovalCard'
import { RejectionSheet } from '@/src/components/RejectionSheet'
import type { ApprovalItem } from '@/src/lib/approvals'

export default function ApprovalsScreen() {
  const router = useRouter()
  const { config } = useConfig()
  const { items, isLoading, error, refetch, approveItem, rejectItem, approveAll } =
    useApprovalItems()

  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null)
  const [isApprovingAll, setIsApprovingAll] = useState(false)

  // Role guard: redirect contributors to hours tab
  useEffect(() => {
    if (config && config.isManager === false) {
      router.replace('/(tabs)/')
    }
  }, [config])

  async function handleApproveAll() {
    setIsApprovingAll(true)
    try {
      await approveAll()
    } finally {
      setIsApprovingAll(false)
    }
  }

  async function handleConfirmReject(reason: string) {
    if (!rejectTarget) return
    const target = rejectTarget
    setRejectTarget(null)
    try {
      await rejectItem(target, reason)
    } catch {
      // Error surfaced via hook's error state
    }
  }

  function renderItem({ item }: { item: ApprovalItem }) {
    return (
      <ApprovalCard
        item={item}
        onApprove={() => approveItem(item)}
        onReject={() => setRejectTarget(item)}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Approvals</Text>
          {items.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{items.length}</Text>
            </View>
          )}
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            style={[styles.approveAllBtn, isApprovingAll && styles.approveAllBtnLoading]}
            onPress={handleApproveAll}
            disabled={isApprovingAll}
            accessibilityLabel="Approve all pending items"
          >
            {isApprovingAll ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveAllText}>Approve All</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : items.length === 0 ? (
        /* Empty state */
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>No pending approvals</Text>
        </View>
      ) : (
        /* Item list */
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        />
      )}

      {/* Rejection bottom sheet */}
      <RejectionSheet
        visible={rejectTarget !== null}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectTarget(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  badge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  approveAllBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  approveAllBtnLoading: {
    backgroundColor: '#86efac',
  },
  approveAllText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
  },
  retryText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    color: '#22c55e',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    paddingTop: 12,
    paddingBottom: 40,
  },
})
