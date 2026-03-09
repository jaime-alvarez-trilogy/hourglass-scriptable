/**
 * Boundary stub: fetchFreshData
 * Implemented in spec 01-foundation / 03-hours-dashboard.
 * Re-exported here so handler.ts has a stable import path.
 */

export interface ApprovalItem {
  id: string;
  type: 'manual' | 'overtime';
}

export interface CrossoverSnapshot {
  pendingApprovals: ApprovalItem[];
  isManager: boolean;
  hoursThisWeek: number;
  earnings: number;
}

/**
 * Fetch a fresh snapshot of Crossover data using on-device credentials.
 * Stub: replaced by real implementation in 01-foundation spec.
 */
export async function fetchFreshData(): Promise<CrossoverSnapshot> {
  throw new Error('fetchFreshData: not yet implemented — pending spec 01-foundation');
}
