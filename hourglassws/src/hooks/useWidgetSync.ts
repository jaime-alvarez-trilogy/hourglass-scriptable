// FR5 (01-widget-activation): useWidgetSync — foreground widget update hook
//
// Fires updateWidgetData() whenever hoursData and config become non-null,
// keeping the home screen widget fresh on every app open.
//
// Errors are swallowed — widget sync failure must never crash or disrupt the UI.

import { useEffect } from 'react';
import { updateWidgetData } from '../widgets/bridge';
import type { HoursData } from '../lib/hours';
import type { AIWeekData } from '../lib/ai';
import type { CrossoverConfig } from '../types/config';

/**
 * Foreground widget sync hook.
 * Call from (tabs)/_layout.tsx to keep widgets updated whenever the app is open.
 *
 * @param hoursData    Weekly hours/earnings data (null = still loading)
 * @param aiData       AI% and BrainLift data (null = unavailable, not blocking)
 * @param pendingCount Pending approval count (0 for contributors)
 * @param config       App configuration (null = still loading)
 */
export function useWidgetSync(
  hoursData: HoursData | null,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig | null
): void {
  useEffect(() => {
    // Guard: only sync when we have the minimum required data
    if (hoursData === null || config === null) {
      return;
    }

    updateWidgetData(hoursData, aiData, pendingCount, config).catch((err: unknown) => {
      console.error('[useWidgetSync] Widget update failed:', err);
    });
  }, [hoursData, pendingCount, config]); // aiData intentionally omitted: AI data changes don't need to re-trigger
}
