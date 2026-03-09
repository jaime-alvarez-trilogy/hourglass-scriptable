// FR3: useApprovalItems — React Query hook for manager approval queue

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadConfig, loadCredentials } from '../store/config'
import { getAuthToken } from '../api/client'
import {
  fetchPendingManual,
  fetchPendingOvertime,
  approveManual,
  rejectManual,
  approveOvertime,
  rejectOvertime,
} from '../api/approvals'
import {
  parseManualItems,
  parseOvertimeItems,
  getWeekStartDate,
} from '../lib/approvals'
import type { ApprovalItem, ManualApprovalItem, OvertimeApprovalItem } from '../lib/approvals'

// Query key for the approval items list
const APPROVALS_KEY = ['approvals'] as const

// ---------------------------------------------------------------------------
// Fetcher — loads config + credentials, fires parallel requests, merges
// ---------------------------------------------------------------------------

async function fetchAllApprovalItems(): Promise<ApprovalItem[]> {
  const [config, credentials] = await Promise.all([loadConfig(), loadCredentials()])

  // Guard: contributor or no config — return empty
  if (!config || !config.isManager || !credentials) return []

  const token = await getAuthToken(credentials.username, credentials.password, config.useQA)
  const weekStartDate = getWeekStartDate()

  const [rawManual, rawOvertime] = await Promise.all([
    fetchPendingManual(token, config.useQA, weekStartDate),
    fetchPendingOvertime(token, config.useQA, weekStartDate),
  ])

  const manualItems = parseManualItems(rawManual, weekStartDate)
  const overtimeItems = parseOvertimeItems(rawOvertime)

  const allItems: ApprovalItem[] = [...manualItems, ...overtimeItems]

  // Sort by startDateTime descending (most recent first)
  allItems.sort((a, b) => (a.startDateTime < b.startDateTime ? 1 : -1))

  return allItems
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useApprovalItems(): {
  items: ApprovalItem[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  approveItem: (item: ApprovalItem) => Promise<void>
  rejectItem: (item: ApprovalItem, reason: string) => Promise<void>
  approveAll: () => Promise<void>
} {
  const queryClient = useQueryClient()
  const [optimisticItems, setOptimisticItems] = useState<ApprovalItem[] | null>(null)

  const { data, isLoading, error, refetch: queryRefetch } = useQuery({
    queryKey: APPROVALS_KEY,
    queryFn: fetchAllApprovalItems,
    retry: false,
    staleTime: 0,
  })

  // Effective items: use optimistic state if active, otherwise query data
  const items = optimisticItems ?? data ?? []

  const refetch = useCallback(() => {
    setOptimisticItems(null)
    queryRefetch()
  }, [queryRefetch])

  // ---------------------------------------------------------------------------
  // approveItem — optimistic remove + API call + re-fetch
  // ---------------------------------------------------------------------------
  const approveItem = useCallback(async (item: ApprovalItem): Promise<void> => {
    const [config, credentials] = await Promise.all([loadConfig(), loadCredentials()])
    if (!config || !credentials) throw new Error('Not configured')

    // Optimistic remove
    const current = optimisticItems ?? data ?? []
    const previousItems = current
    setOptimisticItems(current.filter((i) => i.id !== item.id))

    try {
      const token = await getAuthToken(credentials.username, credentials.password, config.useQA)

      if (item.category === 'MANUAL') {
        const manualItem = item as ManualApprovalItem
        if (manualItem.timecardIds.length === 0) {
          console.warn('[useApprovalItems] approveItem: empty timecardIds, skipping')
          setOptimisticItems(null)
          return
        }
        await approveManual(token, config.useQA, config.userId, manualItem.timecardIds)
      } else {
        const overtimeItem = item as OvertimeApprovalItem
        await approveOvertime(token, config.useQA, overtimeItem.overtimeId)
      }
    } catch (err) {
      // Restore on failure
      setOptimisticItems(previousItems)
      throw err
    } finally {
      // Re-fetch in background
      queryClient.invalidateQueries({ queryKey: APPROVALS_KEY })
    }
  }, [optimisticItems, data, queryClient])

  // ---------------------------------------------------------------------------
  // rejectItem — optimistic remove + API call + re-fetch
  // ---------------------------------------------------------------------------
  const rejectItem = useCallback(async (item: ApprovalItem, reason: string): Promise<void> => {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason cannot be empty')
    }

    const [config, credentials] = await Promise.all([loadConfig(), loadCredentials()])
    if (!config || !credentials) throw new Error('Not configured')

    // Optimistic remove
    const current = optimisticItems ?? data ?? []
    const previousItems = current
    setOptimisticItems(current.filter((i) => i.id !== item.id))

    try {
      const token = await getAuthToken(credentials.username, credentials.password, config.useQA)

      if (item.category === 'MANUAL') {
        const manualItem = item as ManualApprovalItem
        await rejectManual(token, config.useQA, config.userId, manualItem.timecardIds, reason)
      } else {
        const overtimeItem = item as OvertimeApprovalItem
        await rejectOvertime(token, config.useQA, overtimeItem.overtimeId, reason)
      }
    } catch (err) {
      // Restore on failure
      setOptimisticItems(previousItems)
      throw err
    } finally {
      queryClient.invalidateQueries({ queryKey: APPROVALS_KEY })
    }
  }, [optimisticItems, data, queryClient])

  // ---------------------------------------------------------------------------
  // approveAll — Promise.allSettled: continues on individual failures
  // ---------------------------------------------------------------------------
  const approveAll = useCallback(async (): Promise<void> => {
    const current = optimisticItems ?? data ?? []
    await Promise.allSettled(current.map((item) => approveItem(item)))
    // Re-fetch after all settle to sync truth
    setOptimisticItems(null)
    queryClient.invalidateQueries({ queryKey: APPROVALS_KEY })
  }, [optimisticItems, data, approveItem, queryClient])

  return {
    items,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    approveItem,
    rejectItem,
    approveAll,
  }
}
