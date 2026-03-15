// FR1: Manager Approvals Screen — NativeWind layout with design tokens
// FR4: Empty states — manager "All caught up" Card + contributor redirect
// FR5: Loading state — SkeletonLoader cards during initial data fetch
//
// Role-guarded: contributors see a brief redirect message before being sent to hours tab.

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useConfig } from '@/src/hooks/useConfig'
import { useApprovalItems } from '@/src/hooks/useApprovalItems'
import { ApprovalCard } from '@/src/components/ApprovalCard'
import { RejectionSheet } from '@/src/components/RejectionSheet'
import Card from '@/src/components/Card'
import SkeletonLoader from '@/src/components/SkeletonLoader'
import FadeInScreen from '@/src/components/FadeInScreen'
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
      router.replace('/(tabs)')
    }
  }, [config])

  // Contributor state — brief render before useEffect redirect fires
  if (config && config.isManager === false) {
    return (
      <View className="flex-1 items-center justify-center p-8 bg-background">
        <Card elevated className="items-center gap-3 w-full">
          <Text className="text-4xl text-textMuted">👤</Text>
          <Text className="text-textSecondary text-base text-center font-body">
            This screen is for managers
          </Text>
        </Card>
      </View>
    )
  }

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

  // FR5: Loading state — initial fetch only (no existing items yet)
  const showSkeletons = isLoading && items.length === 0

  return (
    <FadeInScreen>
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 bg-surface border-b border-border">
        <View className="flex-row items-center gap-2">
          <Text className="text-textPrimary text-xl font-display-bold">Approvals</Text>
          {items.length > 0 && (
            <View className="bg-violet/20 rounded-full px-2 py-0.5">
              <Text className="text-violet text-xs font-sans-bold">{items.length}</Text>
            </View>
          )}
        </View>

        {items.length > 0 && (
          <Pressable
            className={`rounded-xl px-4 py-2 ${isApprovingAll ? 'bg-success/50' : 'bg-success'}`}
            onPress={handleApproveAll}
            disabled={isApprovingAll}
            accessibilityLabel="Approve all pending items"
          >
            {isApprovingAll ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-sans-semibold text-sm">Approve All</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Error banner */}
      {error && (
        <View className="flex-row items-center bg-critical/10 px-4 py-2.5 gap-3">
          <Text className="text-critical text-sm flex-1">{error}</Text>
          <Pressable onPress={refetch}>
            <Text className="text-violet font-sans-semibold text-sm">Retry</Text>
          </Pressable>
        </View>
      )}

      {/* FR5: Loading state — SkeletonLoader cards */}
      {showSkeletons ? (
        <View className="px-4 pt-3 gap-3">
          <SkeletonLoader className="h-24 rounded-2xl" />
          <SkeletonLoader className="h-24 rounded-2xl" />
          <SkeletonLoader className="h-24 rounded-2xl" />
        </View>
      ) : items.length === 0 ? (
        /* FR4: Manager empty state */
        <View className="flex-1 items-center justify-center p-8">
          <Card className="items-center w-full">
            <Text className="text-5xl text-success mb-3">✓</Text>
            <Text className="text-textPrimary text-xl font-sans-semibold mb-1.5">
              All caught up
            </Text>
            <Text className="text-textSecondary text-sm text-center">
              No pending approvals
            </Text>
          </Card>
        </View>
      ) : (
        /* Item list */
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#10B981"
            />
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
    </FadeInScreen>
  )
}
