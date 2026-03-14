import {
  computePanelState,
  computeDaysElapsed,
  PACING_ON_TRACK_THRESHOLD,
  PACING_BEHIND_THRESHOLD,
} from '../panelState';

describe('computePanelState', () => {
  // ---------------------------------------------------------------------------
  // Happy path — all five states
  // ---------------------------------------------------------------------------
  describe('happy path — five states', () => {
    it('returns idle when Mon morning with 0 hours worked', () => {
      expect(computePanelState(0, 40, 0)).toBe('idle');
    });

    it('returns onTrack when ahead of pace mid-week (Wed, 20h worked, expected 16h)', () => {
      // daysElapsed=2, expected = (2/5)*40 = 16, ratio = 20/16 = 1.25 ≥ 0.85
      expect(computePanelState(20, 40, 2)).toBe('onTrack');
    });

    it('returns onTrack when Thu at 30h worked (expected 32h, ratio 0.9375)', () => {
      // daysElapsed=4, expected = (4/5)*40 = 32, ratio = 30/32 = 0.9375 ≥ 0.85
      expect(computePanelState(30, 40, 4)).toBe('onTrack');
    });

    it('returns crushedIt when at exactly 40h on Fri', () => {
      expect(computePanelState(40, 40, 5)).toBe('crushedIt');
    });

    it('returns crushedIt when over 40h on Fri', () => {
      expect(computePanelState(42, 40, 5)).toBe('crushedIt');
    });

    it('returns behind when recoverable behind mid-week (Wed, 10h, expected 16h, ratio 0.625)', () => {
      // daysElapsed=2, expected = (2/5)*40 = 16, ratio = 10/16 = 0.625 ≥ 0.60
      expect(computePanelState(10, 40, 2)).toBe('behind');
    });

    it('returns critical when severely behind mid-week (Wed, 5h, expected 16h, ratio 0.3125)', () => {
      // daysElapsed=2, expected = (2/5)*40 = 16, ratio = 5/16 = 0.3125 < 0.60
      expect(computePanelState(5, 40, 2)).toBe('critical');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('returns idle when weeklyLimit is 0 (no division by zero)', () => {
      expect(computePanelState(0, 0, 3)).toBe('idle');
    });

    it('returns idle when weeklyLimit is negative', () => {
      expect(computePanelState(0, -10, 3)).toBe('idle');
    });

    it('returns idle when daysElapsed=0 and hoursWorked=0', () => {
      expect(computePanelState(0, 40, 0)).toBe('idle');
    });

    it('returns onTrack when daysElapsed=0 but some hours worked (early work is positive)', () => {
      expect(computePanelState(5, 40, 0)).toBe('onTrack');
    });

    it('clamps daysElapsed > 5 to 5 (returns crushedIt with 40h/40 limit)', () => {
      expect(computePanelState(40, 40, 7)).toBe('crushedIt');
    });

    it('clamps daysElapsed < 0 to 0 with 0 hours → idle', () => {
      expect(computePanelState(0, 40, -1)).toBe('idle');
    });

    it('treats negative hoursWorked as 0 (returns critical)', () => {
      // hoursWorked clamped to 0, daysElapsed=3, expected=24, ratio=0/24=0 < 0.60
      expect(computePanelState(-1, 40, 3)).toBe('critical');
    });
  });

  // ---------------------------------------------------------------------------
  // Threshold boundaries
  // ---------------------------------------------------------------------------
  describe('threshold boundaries', () => {
    // PACING_ON_TRACK_THRESHOLD = 0.85 (inclusive)
    it('returns onTrack when pacingRatio is exactly PACING_ON_TRACK_THRESHOLD (0.85)', () => {
      // Need: hours / (days/5 * 40) = 0.85
      // Use daysElapsed=5, expected=40, hours=34 → ratio=34/40=0.85
      expect(computePanelState(34, 40, 5)).toBe('onTrack');
    });

    it('returns behind when pacingRatio is just below PACING_ON_TRACK_THRESHOLD (0.84)', () => {
      // hours / (days/5 * 40) = 0.84 → hours=33.6, use daysElapsed=5, hours=33.6
      expect(computePanelState(33.6, 40, 5)).toBe('behind');
    });

    // PACING_BEHIND_THRESHOLD = 0.60 (inclusive)
    it('returns behind when pacingRatio is exactly PACING_BEHIND_THRESHOLD (0.60)', () => {
      // daysElapsed=5, expected=40, hours=24 → ratio=24/40=0.60
      expect(computePanelState(24, 40, 5)).toBe('behind');
    });

    it('returns critical when pacingRatio is just below PACING_BEHIND_THRESHOLD (0.59)', () => {
      // daysElapsed=5, expected=40, hours=23.6 → ratio=23.6/40=0.59
      expect(computePanelState(23.6, 40, 5)).toBe('critical');
    });
  });

  // ---------------------------------------------------------------------------
  // Constant exports
  // ---------------------------------------------------------------------------
  describe('exported constants', () => {
    it('exports PACING_ON_TRACK_THRESHOLD as 0.85', () => {
      expect(PACING_ON_TRACK_THRESHOLD).toBe(0.85);
    });

    it('exports PACING_BEHIND_THRESHOLD as 0.60', () => {
      expect(PACING_BEHIND_THRESHOLD).toBe(0.6);
    });
  });
});

// ---------------------------------------------------------------------------
// computeDaysElapsed — FR1 (05-hours-dashboard)
// Uses local timezone via Date.getDay() / getHours() etc.
// ---------------------------------------------------------------------------

describe('computeDaysElapsed', () => {
  // Helper: build a local Date for a given ISO-like string but interpreted
  // in local time (avoid UTC shift).
  function localDate(
    year: number,
    month: number, // 1-based
    day: number,
    hour = 12,
    minute = 0,
    second = 0,
  ): Date {
    return new Date(year, month - 1, day, hour, minute, second, 0);
  }

  describe('weekdays', () => {
    it('SC1.1 — Monday 08:00 → 1', () => {
      // 2026-03-09 is a Monday
      expect(computeDaysElapsed(localDate(2026, 3, 9, 8, 0, 0))).toBe(1);
    });

    it('SC1.2 — Monday 00:00:00 → 0 (start-of-week edge)', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 9, 0, 0, 0))).toBe(0);
    });

    it('SC1.3 — Tuesday 12:00 → 2', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 10, 12, 0, 0))).toBe(2);
    });

    it('SC1.4 — Wednesday 12:00 → 3', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 11, 12, 0, 0))).toBe(3);
    });

    it('SC1.5 — Thursday 09:00 → 4', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 12, 9, 0, 0))).toBe(4);
    });

    it('SC1.6 — Friday 23:59 → 5', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 13, 23, 59, 0))).toBe(5);
    });
  });

  describe('weekend clamping', () => {
    it('SC1.7 — Saturday 10:00 → 5 (clamped)', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 14, 10, 0, 0))).toBe(5);
    });

    it('SC1.8 — Sunday 10:00 → 5 (clamped)', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 15, 10, 0, 0))).toBe(5);
    });
  });

  describe('Monday midnight boundary', () => {
    it('SC1.9 — Monday 00:01 → 1 (one minute past midnight is elapsed)', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 9, 0, 1, 0))).toBe(1);
    });

    it('SC1.10 — Monday 23:59:59 → 1', () => {
      expect(computeDaysElapsed(localDate(2026, 3, 9, 23, 59, 59))).toBe(1);
    });
  });

  describe('no-argument call', () => {
    it('SC1.11 — called with no argument does not crash and returns 0–5', () => {
      const result = computeDaysElapsed();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(5);
    });
  });
});
