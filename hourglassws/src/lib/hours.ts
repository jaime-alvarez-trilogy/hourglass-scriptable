// FR1: Business logic — calculateHours, date utilities
// Pure functions with no side effects. Fully testable.

export type UrgencyLevel = 'none' | 'low' | 'high' | 'critical' | 'expired';

export interface DailyEntry {
  date: string;      // YYYY-MM-DD
  hours: number;
  isToday: boolean;
}

export interface HoursData {
  total: number;
  average: number;
  today: number;
  daily: DailyEntry[];
  weeklyEarnings: number;
  todayEarnings: number;
  hoursRemaining: number;
  overtimeHours: number;
  timeRemaining: number; // ms
  deadline: Date;
}

export interface TimesheetResponse {
  totalHours?: number;
  hourWorked?: number;
  averageHoursPerDay: number;
  stats?: Array<{ date: string; hours: number }>;
}

export interface PaymentsResponse {
  paidHours: number;
  workedHours: number;
  amount: number;
}

// ─── getSundayMidnightGMT ─────────────────────────────────────────────────────

/**
 * Returns the Sunday 23:59:59 UTC of the current UTC week.
 * If today is already Sunday, returns end of today (not next week).
 */
export function getSundayMidnightGMT(): Date {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;

  const deadline = new Date(now);
  deadline.setUTCDate(deadline.getUTCDate() + daysUntilSunday);
  deadline.setUTCHours(23, 59, 59, 999);

  return deadline;
}

// ─── getWeekStartDate ─────────────────────────────────────────────────────────

/**
 * Returns the Monday of the current week as a YYYY-MM-DD string.
 * useUTC=true uses Date.UTC() arithmetic (safe for API calls, immune to timezone shifts).
 * useUTC=false uses local date arithmetic (for local display).
 *
 * CRITICAL: Never use new Date().toISOString() for local dates —
 * it shifts the date to UTC, which may change the date in non-UTC timezones.
 */
export function getWeekStartDate(useUTC: boolean): string {
  if (useUTC) {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday
    );
    // Safe to use toISOString here because mondayUTC is already UTC-aligned
    return new Date(mondayUTC).toISOString().slice(0, 10);
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - daysToMonday);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// ─── getUrgencyLevel ──────────────────────────────────────────────────────────

/**
 * Returns urgency level based on milliseconds remaining until deadline.
 * Boundary cases: exactly 12h → 'low', exactly 3h → 'high', exactly 1h → 'critical'
 */
export function getUrgencyLevel(timeRemainingMs: number): UrgencyLevel {
  if (timeRemainingMs < 0) return 'expired';

  const hours = timeRemainingMs / (1000 * 60 * 60);

  if (hours > 12) return 'none';
  if (hours > 3) return 'low';
  if (hours > 1) return 'high';
  return 'critical';
}

// ─── formatTimeRemaining ──────────────────────────────────────────────────────

/**
 * Converts milliseconds to a human-readable time string.
 * Negative → "Expired"
 * > 24h → "Xd Xh"
 * 1h–24h → "Xh Xm"
 * < 1h → "Xm"
 */
export function formatTimeRemaining(ms: number): string {
  if (ms < 0) return 'Expired';

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  if (totalHours > 0) {
    return `${totalHours}h ${remainingMinutes}m`;
  }
  return `${totalMinutes}m`;
}

// ─── getWeekLabels ────────────────────────────────────────────────────────────

/**
 * Returns `count` human-readable week-start labels, oldest first.
 * Each label is the Monday of that week, formatted "MMM D" (e.g. "Mar 3").
 * Uses local timezone. count=0 returns [].
 *
 * Example for count=4 on a Wednesday 2026-03-18:
 *   ["Feb 23", "Mar 2", "Mar 9", "Mar 16"]
 */
export function getWeekLabels(count: number): string[] {
  if (count === 0) return [];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: string[] = [];
  const now = new Date();
  const dow = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  // i = weeks back from current (count-1 = oldest, 0 = current)
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysToMonday - i * 7);
    result.push(`${MONTHS[d.getMonth()]} ${d.getDate()}`);
  }
  return result;
}

// ─── calculateHours ───────────────────────────────────────────────────────────

/**
 * Derives HoursData from raw API responses.
 * Pure function — no side effects, fully testable.
 *
 * Priority rules:
 * - total: payments.paidHours > 0 → use it; else timesheet.totalHours/hourWorked
 * - weeklyEarnings: payments.amount > 0 → use it; else total * hourlyRate
 * - today: matched by local YYYY-MM-DD date string from stats array
 */
export function calculateHours(
  timesheetData: TimesheetResponse | null | undefined,
  paymentsData: PaymentsResponse | null | undefined,
  hourlyRate: number,
  weeklyLimit: number
): HoursData {
  const deadline = getSundayMidnightGMT();
  const now = Date.now();
  const timeRemaining = deadline.getTime() - now;
  const limit = weeklyLimit || 40;

  // Handle null/missing timesheet
  if (!timesheetData) {
    return {
      total: 0,
      average: 0,
      today: 0,
      daily: [],
      weeklyEarnings: 0,
      todayEarnings: 0,
      hoursRemaining: limit,
      overtimeHours: 0,
      timeRemaining,
      deadline,
    };
  }

  // Extract timesheet values
  const timesheetTotal = parseFloat(
    String(timesheetData.totalHours ?? timesheetData.hourWorked ?? 0)
  );
  const averageHours = parseFloat(String(timesheetData.averageHoursPerDay ?? 0));
  const stats = timesheetData.stats ?? [];

  // Prefer payments.paidHours when available and > 0
  const total =
    paymentsData && paymentsData.paidHours > 0
      ? paymentsData.paidHours
      : timesheetTotal;

  // Today's hours by local date string match
  const todayLocal = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const todayEntry = stats.find((s) => s.date.startsWith(todayLocal));
  const todayHours = todayEntry ? todayEntry.hours : 0;

  // Build daily entries with isToday flag
  // Normalize date: API returns full ISO datetime ("2026-03-09T00:00:00.000Z"), slice to YYYY-MM-DD
  const daily: DailyEntry[] = stats.map((s) => ({
    date: s.date.slice(0, 10),
    hours: s.hours,
    isToday: s.date.startsWith(todayLocal),
  }));

  // Earnings
  const weeklyEarnings =
    paymentsData && paymentsData.amount > 0
      ? paymentsData.amount
      : total * hourlyRate;
  const todayEarnings = todayHours * hourlyRate;

  // Remaining / overtime
  const hoursRemaining = Math.max(0, limit - total);
  const overtimeHours = Math.max(0, total - limit);

  return {
    total,
    average: averageHours,
    today: todayHours,
    daily,
    weeklyEarnings,
    todayEarnings,
    hoursRemaining,
    overtimeHours,
    timeRemaining,
    deadline,
  };
}
