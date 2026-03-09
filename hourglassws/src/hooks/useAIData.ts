// FR7, FR8 (04-ai-brainlift): useAIData hook
// Reads AI cache from AsyncStorage (instant display), background-fetches stale days,
// aggregates weekly AI% and BrainLift metrics.

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from './useConfig';
import { loadCredentials } from '../store/config';
import { fetchWorkDiary } from '../api/workDiary';
import {
  countDiaryTags,
  aggregateAICache,
  shouldRefetchDay,
  getMondayOfWeek,
} from '../lib/ai';
import { AuthError, NetworkError } from '../api/errors';
import type { TagData, AIWeekData } from '../lib/ai';

// ─── Types ────────────────────────────────────────────────────────────────────

// Stored as a plain Record; _lastFetchedAt is a string mixed in, others are TagData.
type AIRawCache = Record<string, TagData | string>;

const CACHE_KEY = 'ai_cache';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for today in local timezone. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Returns YYYY-MM-DD for sunday 6 days after monday (same week). */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Returns an array of YYYY-MM-DD from start to end (inclusive). */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

/**
 * Prunes cache to current Mon–Sun window.
 * Removes _lastFetchedAt and out-of-window date entries.
 */
function pruneToCurrentWeek(
  raw: Record<string, unknown>,
  today: string,
): Record<string, TagData> {
  const monday = getMondayOfWeek(today);
  const sunday = addDays(monday, 6);
  const result: Record<string, TagData> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === '_lastFetchedAt') continue;
    if (k >= monday && k <= sunday) {
      result[k] = v as TagData;
    }
  }
  return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAIDataResult {
  data: AIWeekData | null;
  isLoading: boolean;
  lastFetchedAt: string | null;
  error: string | null;
  refetch: () => void;
}

export function useAIData(): UseAIDataResult {
  const { config } = useConfig();
  const [data, setData] = useState<AIWeekData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (forceRefetchToday = false) => {
    if (!config) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setError(null);

    const today = todayLocal();

    try {
      // Load credentials
      const credentials = await loadCredentials();
      if (!credentials) {
        isFetchingRef.current = false;
        return;
      }

      // Load existing cache
      let rawCache: AIRawCache = {};
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (stored) {
          rawCache = JSON.parse(stored) as AIRawCache;
        }
      } catch {
        rawCache = {};
      }

      // Prune to current week
      const lastFetchedAtVal = (rawCache._lastFetchedAt as string | undefined) ?? null;
      const weekCache: Record<string, TagData> = pruneToCurrentWeek(rawCache, today);

      // Set instant data from cache
      const instantData = aggregateAICache(weekCache, today);
      setData(instantData);
      setLastFetchedAt(lastFetchedAtVal);
      setIsLoading(false); // already have cache data

      // Determine which days need fetching
      const monday = getMondayOfWeek(today);
      const days = dateRange(monday, today);
      const daysToFetch = days.filter((date) => {
        const isToday = date === today;
        return forceRefetchToday
          ? isToday || shouldRefetchDay(date, weekCache[date], false)
          : shouldRefetchDay(date, weekCache[date], isToday);
      });

      if (daysToFetch.length === 0) {
        isFetchingRef.current = false;
        return;
      }

      setIsLoading(true);

      // Fetch stale/missing days in parallel
      const results = await Promise.all(
        daysToFetch.map(async (date) => {
          const slots = await fetchWorkDiary(
            config.assignmentId,
            date,
            credentials,
            config.useQA,
          );
          return { date, tagData: countDiaryTags(slots) };
        }),
      );

      // Merge fresh data into week cache
      for (const { date, tagData } of results) {
        weekCache[date] = tagData;
      }

      // Save merged cache
      const newLastFetchedAt = new Date().toISOString();
      const toSave: AIRawCache = { ...weekCache, _lastFetchedAt: newLastFetchedAt };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toSave));

      // Re-aggregate and update
      const freshData = aggregateAICache(weekCache, today);
      setData(freshData);
      setLastFetchedAt(newLastFetchedAt);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof AuthError) {
        setError('auth');
        setData(null);
      } else if (err instanceof NetworkError) {
        setError('network');
        setData(null);
      } else {
        setError('unknown');
        setData(null);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      void fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.assignmentId]);

  const refetch = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  return { data, isLoading, lastFetchedAt, error, refetch };
}
