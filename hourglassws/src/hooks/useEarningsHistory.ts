/**
 * useEarningsHistory — persistent 12-week earnings trend
 *
 * Strategy:
 *   1. On mount, load AsyncStorage cache → render immediately (instant display)
 *   2. If cache is missing or stale (current week entry >1h old), fetch from API
 *   3. Merge API response into cache:
 *        - Past weeks are finalized — once stored they're kept forever
 *        - Current week overwrites the cached value (payments trickle in through the week)
 *   4. Save merged cache back to AsyncStorage
 *
 * Returns number[] of length NUM_WEEKS, oldest first. Missing weeks = 0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from './useConfig';
import { loadCredentials } from '../store/config';
import { getAuthToken, apiGet } from '../api/client';
import type { Payment } from '../lib/payments';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'earnings_history_v1';
const NUM_WEEKS = 12;
const CURRENT_WEEK_STALE_MS = 60 * 60 * 1000; // 1 hour

// ─── Types ────────────────────────────────────────────────────────────────────

interface EarningsHistoryCache {
  /** weekFrom (YYYY-MM-DD) → earnings amount for that week */
  weeks: Record<string, number>;
  /** ISO timestamp of last API fetch */
  lastFetchedAt: string;
  /** weekFrom of the current week at time of last fetch (used to detect week rollover) */
  currentWeekFrom: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getUTCMondayNWeeksAgo(weeksBack: number): string {
  const now = new Date();
  const dow = now.getUTCDay();
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const ms = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysToMonday - weeksBack * 7,
  );
  return new Date(ms).toISOString().slice(0, 10);
}

function getCurrentUTCSunday(): string {
  const now = new Date();
  const dow = now.getUTCDay();
  const daysToSunday = dow === 0 ? 0 : 7 - dow;
  const ms = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysToSunday,
  );
  return new Date(ms).toISOString().slice(0, 10);
}

/** Build a sorted array of NUM_WEEKS Monday dates (oldest first). */
function buildWeekKeys(): string[] {
  const keys: string[] = [];
  for (let i = NUM_WEEKS - 1; i >= 0; i--) {
    keys.push(getUTCMondayNWeeksAgo(i));
  }
  return keys;
}

/** Convert a week map into a number[] of length NUM_WEEKS (oldest first). */
function mapToTrend(weeks: Record<string, number>): number[] {
  return buildWeekKeys().map(k => weeks[k] ?? 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseEarningsHistoryResult {
  /** Weekly earnings, oldest first, length = NUM_WEEKS. Missing weeks = 0. */
  trend: number[];
  isLoading: boolean;
}

export function useEarningsHistory(): UseEarningsHistoryResult {
  const { config } = useConfig();
  const [trend, setTrend] = useState<number[]>(new Array(NUM_WEEKS).fill(0));
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async (cachedWeeks: Record<string, number>) => {
    if (!config || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const creds = await loadCredentials();
      if (!creds) return;
      const token = await getAuthToken(creds.username, creds.password, config.useQA);

      const from = getUTCMondayNWeeksAgo(NUM_WEEKS - 1);
      const to = getCurrentUTCSunday();

      const result = await apiGet<Payment[]>(
        '/api/v3/users/current/payments',
        { from, to },
        token,
        config.useQA,
      );

      if (!Array.isArray(result)) return;

      // Merge: API data wins for all returned weeks (current week may have updated)
      const merged = { ...cachedWeeks };
      for (const p of result) {
        // Normalize from date to YYYY-MM-DD (API may return ISO datetime)
        const weekFrom = p.from.slice(0, 10);
        merged[weekFrom] = (merged[weekFrom] ?? 0) + p.amount;
      }

      const newTrend = mapToTrend(merged);
      setTrend(newTrend);

      const newCache: EarningsHistoryCache = {
        weeks: merged,
        lastFetchedAt: new Date().toISOString(),
        currentWeekFrom: getUTCMondayNWeeksAgo(0),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    } catch {
      // Non-fatal — sparkline keeps showing cached data
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;

    let cancelled = false;

    async function load() {
      // Step 1: load cache instantly
      let cachedWeeks: Record<string, number> = {};
      let needsFetch = true;

      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cache = JSON.parse(raw) as EarningsHistoryCache;
          cachedWeeks = cache.weeks ?? {};

          const currentWeekFrom = getUTCMondayNWeeksAgo(0);
          const lastFetched = new Date(cache.lastFetchedAt).getTime();
          const age = Date.now() - lastFetched;

          // Only re-fetch if: cache is old (>1h) OR we've rolled into a new week
          needsFetch = age > CURRENT_WEEK_STALE_MS || cache.currentWeekFrom !== currentWeekFrom;
        }
      } catch {
        needsFetch = true;
      }

      if (cancelled) return;

      // Show cached data immediately
      if (Object.keys(cachedWeeks).length > 0) {
        setTrend(mapToTrend(cachedWeeks));
        setIsLoading(false);
      }

      // Step 2: refresh from API if needed
      if (needsFetch) {
        await refresh(cachedWeeks);
      } else {
        setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [config?.userId]);

  return { trend, isLoading };
}
