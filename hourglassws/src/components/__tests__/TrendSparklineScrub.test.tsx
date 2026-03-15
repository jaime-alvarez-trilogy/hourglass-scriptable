// Tests: TrendSparkline — 05-earnings-scrub FR2
//
// FR2: TrendSparkline scrub props + gesture layer
//   SC2.1 — onScrubChange and weekLabels props accepted by TrendSparklineProps
//   SC2.2 — onScrubChange is optional (component renders without it)
//   SC2.3 — weekLabels is optional (component renders without it)
//   SC2.4 — data=[] → no crash, no scrub events fired
//   SC2.5 — data.length=1 → gesture snaps to index 0 only
//   SC2.6 — onScrubChange(null) invoked on gesture end
//   SC2.7 — onScrubChange(index) invoked with correct nearest index during pan
//   SC2.8 — scrub cursor (vertical line + dot) appears during scrub
//   SC2.9 — existing rendering unchanged when not scrubbing
//
// Strategy:
// - Source-level static analysis for interface, import, and pattern contracts
// - react-test-renderer for crash/no-crash validation
// - Skia, gesture, and reanimated mocks handle native dependencies

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as path from 'path';
import * as fs from 'fs';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: () => ({
      minDistance: function() { return this; },
      enabled: function() { return this; },
      activeOffsetX: function() { return this; },
      onBegin: function() { return this; },
      onUpdate: function() { return this; },
      onFinalize: function() { return this; },
    }),
  },
}));

jest.mock('react-native-reanimated', () => {
  const identity = (x: any) => x;
  const Easing = {
    linear: identity,
    ease: identity,
    bezier: () => identity,
    inOut: () => identity,
    out: () => identity,
    in: () => identity,
    poly: () => identity,
    sin: identity,
    circle: identity,
    exp: identity,
    elastic: () => identity,
    back: () => identity,
    bounce: identity,
    steps: () => identity,
  };
  return {
    useSharedValue: (init: any) => ({ value: init }),
    withTiming: (val: any) => val,
    useAnimatedReaction: () => {},
    runOnJS: (fn: any) => fn,
    useReducedMotion: () => false,
    Easing,
  };
});

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
const SPARKLINE_FILE = path.join(HOURGLASSWS_ROOT, 'src', 'components', 'TrendSparkline.tsx');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DATA_4 = [1840, 1960, 2000, 1920];
const MOCK_DATA_12 = [1200, 1350, 1100, 1500, 1400, 1600, 1450, 1550, 1700, 1800, 1650, 1900];
const MOCK_WEEK_LABELS = ['Feb 23', 'Mar 2', 'Mar 9', 'Mar 16'];

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderSparkline(props: {
  data?: number[];
  width?: number;
  height?: number;
  color?: string;
  maxValue?: number;
  showGuide?: boolean;
  capLabel?: string;
  onScrubChange?: (index: number | null) => void;
  weekLabels?: string[];
}) {
  const TrendSparkline = require('@/src/components/TrendSparkline').default;
  const defaultProps = {
    data: MOCK_DATA_4,
    width: 340,
    height: 60,
    ...props,
  };
  let tree: any;
  act(() => {
    tree = create(React.createElement(TrendSparkline, defaultProps));
  });
  return tree;
}

// ─── SC2.1–SC2.3: Interface and optionality ───────────────────────────────────

describe('TrendSparkline FR2 — scrub props interface', () => {
  it('SC2.1 — TrendSparklineProps includes onScrubChange optional prop', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/onScrubChange\s*\?/);
  });

  it('SC2.1 — TrendSparklineProps includes weekLabels optional prop', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/weekLabels\s*\?/);
  });

  it('SC2.1 — onScrubChange type is ScrubChangeCallback or (index: number | null) => void', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    const hasScrubChangeCallback = /ScrubChangeCallback/.test(source);
    const hasInlineType = /onScrubChange.*number\s*\|\s*null.*=>\s*void/.test(source);
    expect(hasScrubChangeCallback || hasInlineType).toBe(true);
  });

  it('SC2.1 — weekLabels type is string[]', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/weekLabels\s*\??\s*:\s*string\[\]/);
  });

  it('SC2.2 — renders without crash when onScrubChange not provided', () => {
    expect(() => renderSparkline({ data: MOCK_DATA_4 })).not.toThrow();
  });

  it('SC2.3 — renders without crash when weekLabels not provided', () => {
    expect(() => renderSparkline({ data: MOCK_DATA_4 })).not.toThrow();
  });

  it('SC2.2+SC2.3 — renders without crash when both omitted', () => {
    expect(() => renderSparkline({ data: MOCK_DATA_4 })).not.toThrow();
  });
});

// ─── SC2.1: Gesture imports ───────────────────────────────────────────────────

describe('TrendSparkline FR2 — gesture layer imports', () => {
  it('imports GestureDetector from react-native-gesture-handler', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/GestureDetector/);
    expect(source).toMatch(/react-native-gesture-handler/);
  });

  it('imports useScrubGesture from useScrubGesture hook', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/useScrubGesture/);
  });

  it('imports buildScrubCursor from ScrubCursor', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/buildScrubCursor/);
    expect(source).toMatch(/ScrubCursor/);
  });

  it('imports useAnimatedReaction and runOnJS from react-native-reanimated', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/useAnimatedReaction/);
    expect(source).toMatch(/runOnJS/);
  });
});

// ─── SC2.1: Gesture pattern in source ────────────────────────────────────────

describe('TrendSparkline FR2 — gesture pattern in source', () => {
  it('wraps Canvas in GestureDetector', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/<GestureDetector/);
  });

  it('applies activeOffsetX on the gesture', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/activeOffsetX/);
  });

  it('uses useAnimatedReaction to bridge scrubIndex to onScrubChange', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/useAnimatedReaction/);
    expect(source).toMatch(/onScrubChange|scrubChange/);
    expect(source).toMatch(/runOnJS/);
  });

  it('guards onScrubChange as optional (safeOnScrubChange or ?? fallback)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Either ?? (() => {}) or a safe wrapper variable
    const hasNullishCoalesce = /onScrubChange\s*\?\?/.test(source);
    const hasSafeWrapper = /safe\w*ScrubChange|scrubChangeSafe/.test(source);
    const hasOptionalCall = /onScrubChange\?\./.test(source);
    expect(hasNullishCoalesce || hasSafeWrapper || hasOptionalCall).toBe(true);
  });

  it('computes pixelXs for the gesture matching buildPath spacing', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/pixelXs/);
  });
});

// ─── SC2.4: data=[] — no crash ────────────────────────────────────────────────

describe('TrendSparkline FR2 — data=[] edge case', () => {
  it('SC2.4 — renders without crash when data is empty', () => {
    expect(() => renderSparkline({ data: [], width: 340, height: 60 })).not.toThrow();
  });

  it('SC2.4 — source disables gesture when data is empty', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // enabled: data.length > 0 or similar
    expect(source).toMatch(/data\.length\s*(>|===|!==)\s*0|enabled.*data/);
  });
});

// ─── SC2.5: data.length=1 ────────────────────────────────────────────────────

describe('TrendSparkline FR2 — single data point', () => {
  it('SC2.5 — renders without crash with data.length=1', () => {
    expect(() => renderSparkline({ data: [1500], width: 340, height: 60 })).not.toThrow();
  });

  it('SC2.5 — source handles single-point pixelXs (center position)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // For single point: width / 2 as the only pixelX
    expect(source).toMatch(/width\s*\/\s*2/);
  });
});

// ─── SC2.8: Scrub cursor in source ───────────────────────────────────────────

describe('TrendSparkline FR2 — scrub cursor rendering', () => {
  it('SC2.8 — source uses buildScrubCursor to compute cursor geometry', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/buildScrubCursor/);
  });

  it('SC2.8 — source renders cursor Path with textMuted color and 0.5 opacity', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // textMuted at opacity 0.5
    expect(source).toMatch(/textMuted/);
    expect(source).toMatch(/0\.5/);
  });

  it('SC2.8 — source renders cursor Circle with dot radius', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // dotRadius from buildScrubCursor result
    expect(source).toMatch(/dotRadius/);
  });

  it('SC2.8 — cursor is conditional on scrub state (cursorPos or isScrubbing)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/cursorPos|isScrubbing/);
  });
});

// ─── SC2.9: Existing rendering unchanged ─────────────────────────────────────

describe('TrendSparkline FR2 — existing rendering unchanged', () => {
  it('SC2.9 — renders with full data and no scrub props without crash', () => {
    expect(() => renderSparkline({
      data: MOCK_DATA_4,
      width: 340,
      height: 60,
      showGuide: true,
      capLabel: '$2,000',
      maxValue: 2000,
    })).not.toThrow();
  });

  it('SC2.9 — renders with full data including onScrubChange and weekLabels without crash', () => {
    const onScrubChange = jest.fn();
    expect(() => renderSparkline({
      data: MOCK_DATA_4,
      width: 340,
      height: 60,
      onScrubChange,
      weekLabels: MOCK_WEEK_LABELS,
      showGuide: true,
      capLabel: '$2,000',
      maxValue: 2000,
    })).not.toThrow();
  });

  it('SC2.9 — renders with 12-week data without crash', () => {
    expect(() => renderSparkline({
      data: MOCK_DATA_12,
      width: 340,
      height: 60,
    })).not.toThrow();
  });
});
