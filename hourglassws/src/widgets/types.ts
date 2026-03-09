// FR1: WidgetData interface — shared data shape for iOS and Android widgets
// Written by app layer, read by both platform widget implementations.

export type WidgetUrgency = 'none' | 'low' | 'high' | 'critical' | 'expired';

export interface WidgetData {
  /** Weekly hours total as string, 1 decimal: "32.5" */
  hours: string;
  /** Weekly hours with unit: "32.5h" */
  hoursDisplay: string;
  /** Formatted earnings: "$1,300" */
  earnings: string;
  /** Raw earnings number for calculations */
  earningsRaw: number;
  /** Today's hours with unit: "6.2h" */
  today: string;
  /** Remaining hours or overtime: "7.5h left" | "2.5h OT" */
  hoursRemaining: string;
  /** AI usage range: "71%–75%" or "N/A" */
  aiPct: string;
  /** BrainLift hours with unit: "3.2h" */
  brainlift: string;
  /** Deadline as Unix timestamp ms */
  deadline: number;
  /** Urgency level for color theming */
  urgency: WidgetUrgency;
  /** Pending approval count — 0 for contributors */
  pendingCount: number;
  /** Whether the current user is a manager */
  isManager: boolean;
  /** Unix timestamp ms of last data refresh */
  cachedAt: number;
  /** Whether using QA environment */
  useQA: boolean;
}
