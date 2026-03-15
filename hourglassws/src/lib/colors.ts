/**
 * colors.ts — Design token color constants for Skia canvas components.
 *
 * ⚠️  SYNC WARNING: This file MUST stay in sync with tailwind.config.js.
 * When you change a color in tailwind.config.js, update the matching value here.
 * These two files are the single source of truth for the Hourglass color system:
 *   - tailwind.config.js → NativeWind className tokens (className="bg-gold")
 *   - colors.ts          → Raw hex values for Skia canvas rendering
 *
 * Why this file exists: Skia renders on a canvas and cannot consume NativeWind
 * className strings. Chart components (WeeklyBarChart, TrendSparkline, AIRingChart)
 * import hex values from here instead of hardcoding them.
 */

export const colors = {
  // Base surfaces
  background:      '#0A0A0F', // App background / screen fill
  surface:         '#13131A', // Default card background
  surfaceElevated: '#1C1C28', // Modals, bottom sheets, popovers, active card
  border:          '#2A2A3D', // Card borders, dividers, input outlines

  // Accent — each colour carries a single semantic meaning
  gold:        '#E8C97A', // Earnings, salary, money values. Primary brand accent.
  cyan:        '#00D4FF', // AI usage percentage and AI-related metrics
  violet:      '#A78BFA', // BrainLift hours and deep-work metrics
  success:     '#10B981', // On-track status, positive deltas, completed items
  warning:     '#F59E0B', // Behind-pace status, caution states, soft alerts
  critical:    '#F43F5E', // Critical behind-pace, overdue approvals, urgent alerts
  destructive: '#F85149', // Destructive actions (delete, reject), irreversible ops

  // Text hierarchy
  textPrimary:   '#FFFFFF', // Hero numbers, headings, primary labels
  textSecondary: '#8B949E', // Supporting labels, metadata, secondary values
  textMuted:     '#484F58', // Placeholder text, disabled states, fine print

  // Special states
  overtimeWhiteGold: '#FFF8E7', // Overtime achievement — warm white-gold, near-white (01-overtime-display)
} as const;

export type ColorKey = keyof typeof colors;
