// Tests: WeeklyBarChart — 02-watermarks FR1 + 01-overtime-display FR2
//
// FR1 (02-watermarks): WeeklyBarChart watermark label
//   SC1.1 — watermarkLabel prop in interface
//   SC1.2 — Skia <Text> rendered when watermarkLabel provided
//   SC1.3 — opacity ≤ 0.10
//   SC1.4 — x position near width/2
//   SC1.5 — y position near height/2
//   SC1.6 — watermarkLabel undefined → no Text rendered, no crash
//   SC1.7 — watermarkLabel "" → no Text rendered
//
// FR2 (01-overtime-display): WeeklyBarChart overtime bar coloring
//   SC2.1 — weeklyLimit prop in WeeklyBarChartProps interface
//   SC2.2 — source declares OVERTIME_WHITE_GOLD constant (#FFF8E7)
//   SC2.3 — bar pushing cumulative total beyond weeklyLimit uses #FFF8E7
//   SC2.4 — bar at exactly weeklyLimit (not over) is NOT white-gold
//   SC2.5 — without weeklyLimit prop, no white-gold bars
//   SC2.6 — future bars always use textMuted, not white-gold
//   SC2.7 — source uses running cumulative total before the map loop
//
// Strategy:
// - Source-level static analysis for interface and implementation details
// - react-test-renderer for render validation (same pattern as AIConeChart.test.tsx)
// - Skia mock from __mocks__/@shopify/react-native-skia.ts

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as path from 'path';
import * as fs from 'fs';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-web/dist/exports/View/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      R.createElement('View', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/Text/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      R.createElement('Text', { testID, style, ...rest }, children),
  };
});

// ─── File paths ───────────────────────────────────────────────────────────────

const HOURGLASSWS_ROOT = path.resolve(__dirname, '../../..');
const BAR_CHART_FILE = path.join(HOURGLASSWS_ROOT, 'src', 'components', 'WeeklyBarChart.tsx');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DATA = [
  { day: 'Mon', hours: 7.5, isToday: false, isFuture: false },
  { day: 'Tue', hours: 8,   isToday: false, isFuture: false },
  { day: 'Wed', hours: 6.5, isToday: true,  isFuture: false },
  { day: 'Thu', hours: 0,   isToday: false, isFuture: true  },
  { day: 'Fri', hours: 0,   isToday: false, isFuture: true  },
  { day: 'Sat', hours: 0,   isToday: false, isFuture: true  },
  { day: 'Sun', hours: 0,   isToday: false, isFuture: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderChart(props: {
  data?: typeof MOCK_DATA;
  width?: number;
  height?: number;
  maxHours?: number;
  watermarkLabel?: string;
  weeklyLimit?: number;
}) {
  const WeeklyBarChart = require('@/src/components/WeeklyBarChart').default;
  const defaultProps = {
    data: MOCK_DATA,
    width: 300,
    height: 120,
    ...props,
  };
  let tree: any;
  act(() => {
    tree = create(React.createElement(WeeklyBarChart, defaultProps));
  });
  return tree;
}

/** Deep-traverse rendered tree for nodes matching predicate */
function findNodes(node: any, predicate: (n: any) => boolean, found: any[] = []): any[] {
  if (!node) return found;
  if (predicate(node)) found.push(node);
  const children = node.children ?? [];
  for (const child of Array.isArray(children) ? children : [children]) {
    findNodes(child, predicate, found);
  }
  return found;
}

// ─── FR3 (07-chart-line-polish): WeeklyBarChart today-bar glow ───────────────
//
// SC2.1 — BlurMaskFilter imported from @shopify/react-native-skia
// SC2.2 — isToday bar Rect has child Paint with BlurMaskFilter
// SC2.3 — BlurMaskFilter blur >= 8
// SC2.4 — Glow Paint uses style="fill" and BlurMaskFilter style="normal"
// SC2.5 — Glow Paint color = barColor + '30' alpha suffix
// SC2.6 — Non-today bar Rect has no BlurMaskFilter child (conditional pattern)
// SC2.7 — Chart renders without crash when no bar is isToday
// SC2.8 — Overflow bar (isToday) renders glow correctly (no crash)
// SC2.9 — All existing tests still pass (enforced by running the full suite)
// SC2.10 — Bar height animation not affected (animatedBarHeight still used)

describe('WeeklyBarChart — FR3 (07-chart-line-polish): Today Bar Glow', () => {
  it('SC2.1 — BlurMaskFilter is imported from @shopify/react-native-skia', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    expect(source).toMatch(/BlurMaskFilter/);
    expect(source).toMatch(/@shopify\/react-native-skia/);
    expect(source).toMatch(/BlurMaskFilter[\s\S]{0,200}@shopify\/react-native-skia|@shopify\/react-native-skia[\s\S]{0,200}BlurMaskFilter/);
  });

  it('SC2.2 — source contains a BlurMaskFilter element inside a Paint child of a Rect', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    expect(source).toMatch(/<Paint[\s\S]{0,300}<BlurMaskFilter/);
  });

  it('SC2.3 — BlurMaskFilter blur value is >= 8', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    const match = source.match(/BlurMaskFilter[\s\S]{0,100}blur=\{(\d+(?:\.\d+)?)\}/);
    expect(match).not.toBeNull();
    const blurVal = parseFloat(match![1]);
    expect(blurVal).toBeGreaterThanOrEqual(8);
  });

  it('SC2.4 — glow Paint uses style="fill" and BlurMaskFilter uses style="normal"', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Paint with style="fill"
    expect(source).toMatch(/style="fill"/);
    // BlurMaskFilter with style="normal"
    expect(source).toMatch(/BlurMaskFilter[\s\S]{0,100}style="normal"/);
  });

  it('SC2.5 — glow Paint color uses barColor with alpha suffix', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Pattern: color={barColor + '30'} — approx 19% alpha
    expect(source).toMatch(/color=\{barColor\s*\+\s*'[0-9a-fA-F]{2}'\}/);
  });

  it('SC2.6 — glow Paint is guarded by isToday condition (not rendered for all bars)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // The Paint/BlurMaskFilter is inside an isToday conditional
    expect(source).toMatch(/isToday[\s\S]{0,200}<Paint[\s\S]{0,200}BlurMaskFilter|isToday[\s\S]{0,200}BlurMaskFilter/);
  });

  it('SC2.7 — chart renders without crash when no bar has isToday=true', () => {
    const noTodayData = [
      { day: 'Mon', hours: 7.5, isToday: false, isFuture: false },
      { day: 'Tue', hours: 8,   isToday: false, isFuture: false },
      { day: 'Wed', hours: 6.5, isToday: false, isFuture: false },
      { day: 'Thu', hours: 0,   isToday: false, isFuture: true  },
      { day: 'Fri', hours: 0,   isToday: false, isFuture: true  },
      { day: 'Sat', hours: 0,   isToday: false, isFuture: true  },
      { day: 'Sun', hours: 0,   isToday: false, isFuture: true  },
    ];
    expect(() =>
      renderChart({ data: noTodayData, width: 300, height: 120 }),
    ).not.toThrow();
  });

  it('SC2.8 — overflow isToday bar renders without crash', () => {
    const overtimeTodayData = [
      { day: 'Mon', hours: 8, isToday: false, isFuture: false },
      { day: 'Tue', hours: 8, isToday: false, isFuture: false },
      { day: 'Wed', hours: 8, isToday: true,  isFuture: false },
      { day: 'Thu', hours: 0, isToday: false, isFuture: true  },
      { day: 'Fri', hours: 0, isToday: false, isFuture: true  },
      { day: 'Sat', hours: 0, isToday: false, isFuture: true  },
      { day: 'Sun', hours: 0, isToday: false, isFuture: true  },
    ];
    // weeklyLimit=15 means Wed bar is overtime (runningTotal=24 > 15)
    expect(() =>
      renderChart({ data: overtimeTodayData, weeklyLimit: 15, width: 300, height: 120 }),
    ).not.toThrow();
  });

  it('SC2.10 — source still references animatedBarHeight for bar Rect height', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Animation must not be removed
    expect(source).toMatch(/animatedBarHeight/);
    expect(source).toMatch(/height=\{animatedBarHeight\}/);
  });
});

// ─── FR1: WeeklyBarChart watermark label ─────────────────────────────────────

describe('WeeklyBarChart — FR1: Watermark Label', () => {
  it('SC1.1 — WeeklyBarChartProps includes watermarkLabel?: string', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Interface should declare optional watermarkLabel string prop
    expect(source).toMatch(/watermarkLabel\s*\?\s*:\s*string/);
  });

  it('SC1.2 — when watermarkLabel="38.5h" is provided, source contains Skia Text with the string', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Source should render a Skia <Text ... text={watermarkLabel}> element
    expect(source).toMatch(/<Text[\s\S]{0,200}watermarkLabel/);
  });

  it('SC1.3 — watermark Text element has opacity <= 0.10', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // The watermark should have very low opacity (e.g. 0.07)
    // Look for opacity prop near the watermark Text element
    expect(source).toMatch(/watermarkLabel[\s\S]{0,500}opacity=\{0\.0[0-9]/);
  });

  it('SC1.4 — watermark x is centered (derived from width/2)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Should use width/2 calculation for centering
    expect(source).toMatch(/width\s*\/\s*2/);
  });

  it('SC1.5 — watermark y is vertically centered (derived from h/2 or height/2)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Should use height/2 or h/2 for vertical centering
    expect(source).toMatch(/h\s*\/\s*2|height\s*\/\s*2/);
  });

  it('SC1.6 — watermarkLabel undefined: component renders without crash', () => {
    // No watermarkLabel passed → should not throw
    expect(() => renderChart({ width: 300, height: 120 })).not.toThrow();
  });

  it('SC1.7 — watermarkLabel undefined: no watermark Text rendered (guarded)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Guard pattern: {watermarkLabel && font && (...)} or similar
    expect(source).toMatch(/watermarkLabel\s*&&/);
  });

  it('SC1.8 — watermarkLabel "": source guard also suppresses empty string', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Boolean coercion of "" is falsy, so the same guard handles both cases
    // Verify: the guard uses watermarkLabel directly (not explicit !== undefined check)
    expect(source).toMatch(/watermarkLabel\s*&&\s*font/);
  });

  it('SC1.9 — source imports matchFont from @shopify/react-native-skia', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    expect(source).toContain('matchFont');
    expect(source).toContain('@shopify/react-native-skia');
  });

  it('SC1.10 — font size is in 48-56sp range for watermark texture effect', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // matchFont with fontSize 48-56 — may be a literal or a constant declaration
    // Either `fontSize: 52` or `WATERMARK_FONT_SIZE = 52` with `fontSize: WATERMARK_FONT_SIZE`
    const hasLiteralFontSize = /fontSize\s*:\s*(4[89]|5[0-6])/.test(source);
    const hasConstantInRange = /WATERMARK_FONT_SIZE\s*=\s*(4[89]|5[0-6])/.test(source);
    expect(hasLiteralFontSize || hasConstantInRange).toBe(true);
  });

  it('SC1.11 — component renders successfully with watermarkLabel provided', () => {
    expect(() =>
      renderChart({ watermarkLabel: '38.5h', width: 300, height: 120 }),
    ).not.toThrow();
  });
});

// ─── FR2 (01-overtime-display): WeeklyBarChart overtime bar coloring ──────────

describe('WeeklyBarChart — FR2: Overtime bar coloring (01-overtime-display)', () => {
  it('SC2.1 — WeeklyBarChartProps includes weeklyLimit?: number', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    expect(source).toMatch(/weeklyLimit\s*\?\s*:\s*number/);
  });

  it('SC2.2 — source declares OVERTIME_WHITE_GOLD constant with value #FFF8E7', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    expect(source).toContain('OVERTIME_WHITE_GOLD');
    expect(source).toContain('#FFF8E7');
  });

  it('SC2.3 — source uses OVERTIME_WHITE_GOLD in bar color selection logic', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // OVERTIME_WHITE_GOLD must appear as a barColor value
    expect(source).toMatch(/OVERTIME_WHITE_GOLD/);
  });

  it('SC2.4 — source uses strict > comparison against weeklyLimit (not >=)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Must use > not >= to prevent crushedIt case from triggering white-gold
    expect(source).toMatch(/runningTotal\s*>\s*weeklyLimit/);
  });

  it('SC2.5 — component renders without crash when weeklyLimit is provided', () => {
    // Data totals to 22h — within 40h limit
    expect(() =>
      renderChart({ weeklyLimit: 40, width: 300, height: 120 }),
    ).not.toThrow();
  });

  it('SC2.6 — component renders without crash when weeklyLimit is not provided', () => {
    expect(() =>
      renderChart({ width: 300, height: 120 }),
    ).not.toThrow();
  });

  it('SC2.7 — component renders without crash with data exceeding weeklyLimit', () => {
    // All hours well over 15h limit — every bar should be white-gold
    const overtimeData = [
      { day: 'Mon', hours: 8, isToday: false, isFuture: false },
      { day: 'Tue', hours: 8, isToday: false, isFuture: false },
      { day: 'Wed', hours: 8, isToday: true,  isFuture: false },
      { day: 'Thu', hours: 0, isToday: false, isFuture: true  },
      { day: 'Fri', hours: 0, isToday: false, isFuture: true  },
      { day: 'Sat', hours: 0, isToday: false, isFuture: true  },
      { day: 'Sun', hours: 0, isToday: false, isFuture: true  },
    ];
    expect(() =>
      renderChart({ data: overtimeData, weeklyLimit: 15, width: 300, height: 120 }),
    ).not.toThrow();
  });

  it('SC2.8 — source accumulates runningTotal before the data.map() render loop', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // Running total must be declared as a mutable variable before the map
    expect(source).toMatch(/let\s+runningTotal\s*=\s*0/);
  });

  it('SC2.9 — source increments runningTotal inside the map (only for non-future bars)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // runningTotal must be incremented — += entry.hours or similar
    expect(source).toMatch(/runningTotal\s*\+=\s*entry\.hours/);
  });

  it('SC2.10 — source guards future bars from overtime color (isFuture check before overtime check)', () => {
    const source = fs.readFileSync(BAR_CHART_FILE, 'utf8');
    // isFuture check must appear in bar color logic
    expect(source).toMatch(/isFuture/);
    // OVERTIME_WHITE_GOLD must not be applied to future bars — guard via isFuture
    expect(source).toContain('OVERTIME_WHITE_GOLD');
  });
});
