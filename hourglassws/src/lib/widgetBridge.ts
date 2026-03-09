/**
 * Boundary stub: updateWidgetData
 * Implemented in spec 06-widgets.
 * Re-exported here so handler.ts has a stable import path.
 */

import { CrossoverSnapshot } from './crossoverData';

/**
 * Write fresh Crossover data to the local store so the home screen widget can read it.
 * Stub: replaced by real implementation in 06-widgets spec.
 */
export async function updateWidgetData(_data: CrossoverSnapshot): Promise<void> {
  throw new Error('updateWidgetData: not yet implemented — pending spec 06-widgets');
}
