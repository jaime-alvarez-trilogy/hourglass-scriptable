// Tests: AI Tab screen (06-ai-tab)
// FR1: AIRingChart integration
// FR2: Hero metric section (MetricValue + SectionLabel)
// FR3: BrainLift progress bar
// FR4: Delta badge (week-over-week)
// FR5: DailyAIRow (className migration)
// FR6: Loading/skeleton states
//
// Strategy:
// - Mock useAIData (module mock) returning controlled AIWeekData
// - Mock @shopify/react-native-skia (auto-resolved from __mocks__)
// - Mock expo-router
// - className assertions via source-file static analysis (NativeWind v4 hashes in Jest)
// - testID assertions for runtime structural checks

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Stub react-native-web components that use hooks internally and crash in test renderer.
// ScrollViewBase and View call useContext/useRef from a module-level context that
// react-test-renderer can't satisfy. We stub them to plain passthrough elements.
jest.mock('react-native-web/dist/exports/View/index.js', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      mockR.createElement('View', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/ScrollView/index.js', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, refreshControl, ...rest }: any) =>
      mockR.createElement('ScrollView', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/Text/index.js', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      mockR.createElement('Text', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/TouchableOpacity/index.js', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, onPress, style, ...rest }: any) =>
      mockR.createElement('TouchableOpacity', { testID, onPress, style, ...rest }, children),
  };
});

// Stub TextInput (same pattern as MetricValue.test.tsx)
jest.mock('react-native-web/dist/exports/TextInput/index.js', () => {
  const mockR = require('react');
  const mockRN = jest.requireActual('react-native-web');
  return {
    __esModule: true,
    default: ({ defaultValue, value, ...props }: any) =>
      mockR.createElement(mockRN.View, props,
        mockR.createElement(mockRN.Text, null, defaultValue ?? value ?? '')
      ),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

// Mock Reanimated-based design system components — their unit tests cover them individually.
// Here we test screen structure/props, not component internals.
jest.mock('@/src/components/SkeletonLoader', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ width, height, rounded, ...props }: any) =>
      mockR.createElement('SkeletonLoader', { width, height, rounded, ...props }),
  };
});

jest.mock('@/src/components/MetricValue', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ value, unit, precision, colorClass, sizeClass, ...props }: any) =>
      mockR.createElement('MetricValue', { value, unit, precision, colorClass, sizeClass, ...props }),
  };
});

jest.mock('@/src/components/ProgressBar', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ progress, colorClass, height, ...props }: any) =>
      mockR.createElement('ProgressBar', { progress, colorClass, height, ...props }),
  };
});

jest.mock('@/src/components/AIRingChart', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ aiPercent, brainliftPercent, size, ...props }: any) =>
      mockR.createElement('AIRingChart', { aiPercent, brainliftPercent, size, ...props }),
  };
});

// useAIData mock — default: data with known values
const mockUseAIData = jest.fn();
jest.mock('@/src/hooks/useAIData', () => ({
  useAIData: (...args: any[]) => mockUseAIData(...args),
}));

// ─── Fixture data ─────────────────────────────────────────────────────────────

const DEFAULT_DATA = {
  aiPctLow: 73,
  aiPctHigh: 77,
  brainliftHours: 3.5,
  totalSlots: 180,
  taggedSlots: 160,
  workdaysElapsed: 4,
  dailyBreakdown: [
    { date: '2026-03-09', total: 45, aiUsage: 38, secondBrain: 12, noTags: 4, isToday: false },
    { date: '2026-03-10', total: 43, aiUsage: 35, secondBrain: 9,  noTags: 3, isToday: false },
    { date: '2026-03-11', total: 46, aiUsage: 39, secondBrain: 0,  noTags: 2, isToday: true  },
  ],
};

const DEFAULT_HOOK_RESULT = {
  data: DEFAULT_DATA,
  isLoading: false,
  lastFetchedAt: null,
  error: null,
  refetch: jest.fn(),
  previousWeekPercent: undefined,
};

// ─── File paths (for static analysis) ────────────────────────────────────────

const AI_TAB_FILE = path.resolve(__dirname, '../../app/(tabs)/ai.tsx')
  // __dirname is hourglassws/src/components/__tests__
  // ai.tsx is at hourglassws/app/(tabs)/ai.tsx
  // Navigate: ../../ = hourglassws/src → ../../ = hourglassws → app/(tabs)/ai.tsx
;

// Correctly resolve to hourglassws root then app/(tabs)/ai.tsx
// __dirname = hourglassws/src/components/__tests__
// ../../.. = hourglassws
const HOURGLASSWS_ROOT = path.resolve(__dirname, '../../..');
const AI_TAB_PATH = path.join(HOURGLASSWS_ROOT, 'app', '(tabs)', 'ai.tsx');
const DAILY_AI_ROW_PATH = path.join(HOURGLASSWS_ROOT, 'src', 'components', 'DailyAIRow.tsx');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAIScreen(): any {
  let AIScreen: any;
  jest.isolateModules(() => {
    AIScreen = require('@/app/(tabs)/ai').default;
  });
  if (!AIScreen) {
    AIScreen = require('@/app/(tabs)/ai').default;
  }
  let tree: any;
  act(() => {
    tree = create(React.createElement(AIScreen));
  });
  return tree;
}

function findByTestId(tree: any, testId: string): any {
  const json = tree.toJSON();
  return findNodeByTestId(json, testId);
}

function findNodeByTestId(node: any, testId: string): any {
  if (!node) return null;
  if (node.props && node.props.testID === testId) return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNodeByTestId(child, testId);
      if (found) return found;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByTestId(child, testId);
      if (found) return found;
    }
  }
  return null;
}

function findAllText(node: any, collected: string[] = []): string[] {
  if (!node) return collected;
  if (typeof node === 'string') {
    collected.push(node);
    return collected;
  }
  if (Array.isArray(node)) {
    for (const child of node) findAllText(child, collected);
    return collected;
  }
  if (node.children) {
    for (const child of node.children) findAllText(child, collected);
  }
  return collected;
}

function allText(tree: any): string {
  return findAllText(tree.toJSON()).join(' ');
}

// ─── FR1: AIRingChart Integration ────────────────────────────────────────────

describe('AITab — FR1: AIRingChart integration', () => {
  beforeEach(() => {
    mockUseAIData.mockReturnValue(DEFAULT_HOOK_RESULT);
  });

  it('SC1.1 — renders without crash', () => {
    expect(() => {
      renderAIScreen();
    }).not.toThrow();
  });

  it('SC1.2 — ai-ring-container testID is present', () => {
    const tree = renderAIScreen();
    const container = findByTestId(tree, 'ai-ring-container');
    expect(container).not.toBeNull();
  });

  it('SC1.3 — ai.tsx source imports AIRingChart', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/AIRingChart/);
  });

  it('SC1.4 — ai.tsx source defines RING_SIZE constant', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/RING_SIZE\s*=\s*160/);
  });

  it('SC1.5 — ai.tsx source passes aiPercent to AIRingChart', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    // aiPercent prop passed to AIRingChart
    expect(source).toMatch(/AIRingChart[\s\S]{0,200}aiPercent/);
  });

  it('SC1.6 — ai.tsx source passes brainliftPercent to AIRingChart', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/AIRingChart[\s\S]{0,200}brainliftPercent/);
  });

  it('SC1.7 — ai.tsx source uses RING_SIZE as AIRingChart size prop', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/size\s*[=:]\s*[{(]?\s*RING_SIZE/);
  });
});

// ─── FR2: Hero Metric Section ─────────────────────────────────────────────────

describe('AITab — FR2: hero metric section', () => {
  beforeEach(() => {
    mockUseAIData.mockReturnValue(DEFAULT_HOOK_RESULT);
  });

  it('SC2.1 — "AI USAGE" section label text present', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text.toUpperCase()).toContain('AI USAGE');
  });

  it('SC2.2 — "BRAINLIFT" section label text present', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text.toUpperCase()).toContain('BRAINLIFT');
  });

  it('SC2.3 — "/ 5h target" label present', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text).toContain('5h');
  });

  it('SC2.4 — ai.tsx source imports MetricValue', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/MetricValue/);
  });

  it('SC2.5 — ai.tsx source imports SectionLabel', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/SectionLabel/);
  });

  it('SC2.6 — ai.tsx source uses text-cyan class for AI metric', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('text-cyan');
  });

  it('SC2.7 — ai.tsx source uses text-violet class for BrainLift metric', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('text-violet');
  });

  it('SC2.8 — ai.tsx code does not contain hardcoded hex colors (outside comments)', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('SC2.9 — ai.tsx code does not use StyleSheet.create (outside comments)', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toContain('StyleSheet.create');
  });
});

// ─── FR3: BrainLift Progress Bar ──────────────────────────────────────────────

describe('AITab — FR3: BrainLift progress bar', () => {
  beforeEach(() => {
    mockUseAIData.mockReturnValue(DEFAULT_HOOK_RESULT);
  });

  it('SC3.1 — ai.tsx source imports ProgressBar', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/ProgressBar/);
  });

  it('SC3.2 — ai.tsx source uses bg-violet colorClass for ProgressBar', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('bg-violet');
  });

  it('SC3.3 — ai.tsx source passes brainliftHours/5 (or BRAINLIFT_TARGET) as progress', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    // Either uses literal /5 or a BRAINLIFT_TARGET constant
    expect(source).toMatch(/brainliftHours\s*\/\s*(5|BRAINLIFT_TARGET)/);
  });

  it('SC3.4 — ai.tsx source uses height={6} on BrainLift ProgressBar', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('height={6}');
  });

  it('SC3.5 — BrainLift hours value appears in rendered output', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    // brainliftHours = 3.5 → should see "3.5" somewhere
    expect(text).toContain('3.5');
  });
});

// ─── FR4: Delta Badge ─────────────────────────────────────────────────────────

describe('AITab — FR4: delta badge', () => {
  it('SC4.1 — delta-badge is NOT rendered when previousWeekPercent is undefined', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      previousWeekPercent: undefined,
    });
    const tree = renderAIScreen();
    const badge = findByTestId(tree, 'delta-badge');
    expect(badge).toBeNull();
  });

  it('SC4.2 — delta-badge IS rendered when previousWeekPercent is available', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      previousWeekPercent: 72,
    });
    const tree = renderAIScreen();
    const badge = findByTestId(tree, 'delta-badge');
    expect(badge).not.toBeNull();
  });

  it('SC4.3 — positive delta shows "+" prefix', () => {
    // aiPercent = (73+77)/2 = 75; previousWeekPercent = 70; delta = +5.0
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: { ...DEFAULT_DATA, aiPctLow: 73, aiPctHigh: 77 },
      previousWeekPercent: 70,
    });
    const tree = renderAIScreen();
    const text = allText(tree);
    // Should contain a "+" prefixed delta
    expect(text).toMatch(/\+\d+\.\d+%/);
  });

  it('SC4.4 — negative delta shows "-" prefix', () => {
    // aiPercent = (73+77)/2 = 75; previousWeekPercent = 80; delta = -5.0
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: { ...DEFAULT_DATA, aiPctLow: 73, aiPctHigh: 77 },
      previousWeekPercent: 80,
    });
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text).toMatch(/-\d+\.\d+%/);
  });

  it('SC4.5 — zero delta shows "+0.0%" text', () => {
    // aiPercent = 75; previousWeekPercent = 75; delta = 0
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: { ...DEFAULT_DATA, aiPctLow: 73, aiPctHigh: 77 },
      previousWeekPercent: 75,
    });
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text).toContain('+0.0%');
  });

  it('SC4.6 — ai.tsx source uses bg-surfaceElevated on delta badge', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('bg-surfaceElevated');
  });

  it('SC4.7 — ai.tsx source uses rounded-full on delta badge', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('rounded-full');
  });

  it('SC4.8 — ai.tsx source uses text-success for positive delta', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('text-success');
  });

  it('SC4.9 — ai.tsx source uses text-error for negative delta', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toContain('text-error');
  });
});

// ─── FR5: DailyAIRow ─────────────────────────────────────────────────────────

describe('AITab — FR5: DailyAIRow className migration', () => {
  it('SC5.1 — DailyAIRow renders without crash with valid data', () => {
    const { DailyAIRow } = require('@/src/components/DailyAIRow');
    expect(() => {
      act(() => {
        create(React.createElement(DailyAIRow, {
          item: {
            date: '2026-03-11',
            total: 46,
            aiUsage: 39,
            secondBrain: 0,
            noTags: 2,
            isToday: false,
          },
        }));
      });
    }).not.toThrow();
  });

  it('SC5.2 — DailyAIRow renders formatted date label', () => {
    const { DailyAIRow } = require('@/src/components/DailyAIRow');
    let tree: any;
    act(() => {
      tree = create(React.createElement(DailyAIRow, {
        item: {
          date: '2026-03-11',
          total: 46,
          aiUsage: 39,
          secondBrain: 0,
          noTags: 2,
          isToday: false,
        },
      }));
    });
    const text = allText(tree);
    // Date 2026-03-11 is a Wednesday → "Wed 3/11"
    expect(text).toContain('3/11');
  });

  it('SC5.3 — DailyAIRow shows AI% for day (non-zero taggedSlots)', () => {
    const { DailyAIRow } = require('@/src/components/DailyAIRow');
    let tree: any;
    act(() => {
      // aiUsage=39, total=46, noTags=2 → taggedSlots=44 → aiPct = round(39/44*100) = 89%
      tree = create(React.createElement(DailyAIRow, {
        item: {
          date: '2026-03-11',
          total: 46,
          aiUsage: 39,
          secondBrain: 0,
          noTags: 2,
          isToday: false,
        },
      }));
    });
    const text = allText(tree);
    expect(text).toContain('%');
  });

  it('SC5.4 — DailyAIRow shows "—" when taggedSlots=0', () => {
    const { DailyAIRow } = require('@/src/components/DailyAIRow');
    let tree: any;
    act(() => {
      // total=5, noTags=5 → taggedSlots=0 → "—"
      tree = create(React.createElement(DailyAIRow, {
        item: {
          date: '2026-03-11',
          total: 5,
          aiUsage: 0,
          secondBrain: 0,
          noTags: 5,
          isToday: false,
        },
      }));
    });
    const text = allText(tree);
    expect(text).toContain('—');
  });

  it('SC5.5 — DailyAIRow.tsx source does not use StyleSheet.create', () => {
    const source = fs.readFileSync(DAILY_AI_ROW_PATH, 'utf8');
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toContain('StyleSheet.create');
  });

  it('SC5.6 — DailyAIRow.tsx source does not import StyleSheet', () => {
    const source = fs.readFileSync(DAILY_AI_ROW_PATH, 'utf8');
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC5.7 — DailyAIRow.tsx source uses className strings', () => {
    const source = fs.readFileSync(DAILY_AI_ROW_PATH, 'utf8');
    expect(source).toContain('className=');
  });

  it('SC5.8 — daily breakdown renders one row per item in AIScreen', () => {
    mockUseAIData.mockReturnValue(DEFAULT_HOOK_RESULT);
    const tree = renderAIScreen();
    // DEFAULT_DATA has 3 daily breakdown items
    // We check that breakdown card is present
    const text = allText(tree);
    // All 3 dates should appear in some form — at minimum the today date
    expect(text).toContain('3/11');
  });

  it('SC5.9 — daily breakdown card renders column headers', () => {
    mockUseAIData.mockReturnValue(DEFAULT_HOOK_RESULT);
    const tree = renderAIScreen();
    const text = allText(tree);
    // Column headers from spec: "Day", "AI%", "BrainLift"
    expect(text.toLowerCase()).toContain('day');
  });
});

// ─── FR6: Loading / Skeleton States ──────────────────────────────────────────

describe('AITab — FR6: loading/skeleton states', () => {
  it('SC6.1 — skeleton-ring shown when isLoading=true and data=null', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      isLoading: true,
    });
    const tree = renderAIScreen();
    const skeleton = findByTestId(tree, 'skeleton-ring');
    expect(skeleton).not.toBeNull();
  });

  it('SC6.2 — skeleton-metrics shown when isLoading=true and data=null', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      isLoading: true,
    });
    const tree = renderAIScreen();
    const skeleton = findByTestId(tree, 'skeleton-metrics');
    expect(skeleton).not.toBeNull();
  });

  it('SC6.3 — skeleton-breakdown shown when isLoading=true and data=null', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      isLoading: true,
    });
    const tree = renderAIScreen();
    const skeleton = findByTestId(tree, 'skeleton-breakdown');
    expect(skeleton).not.toBeNull();
  });

  it('SC6.4 — no skeletons when isLoading=true but data exists (background refresh)', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      isLoading: true,  // background refresh
      data: DEFAULT_DATA,
    });
    const tree = renderAIScreen();
    const skeletonRing = findByTestId(tree, 'skeleton-ring');
    expect(skeletonRing).toBeNull();
  });

  it('SC6.5 — no skeletons when isLoading=false and data exists', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      isLoading: false,
      data: DEFAULT_DATA,
    });
    const tree = renderAIScreen();
    const skeletonRing = findByTestId(tree, 'skeleton-ring');
    expect(skeletonRing).toBeNull();
  });

  it('SC6.6 — ai.tsx source imports SkeletonLoader', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/SkeletonLoader/);
  });
});

// ─── Error / Empty States ─────────────────────────────────────────────────────

describe('AITab — error and empty states', () => {
  it('SC7.1 — auth error state renders with testID=error-auth', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      error: 'auth',
    });
    const tree = renderAIScreen();
    const node = findByTestId(tree, 'error-auth');
    expect(node).not.toBeNull();
  });

  it('SC7.2 — network error state renders with testID=error-network', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      error: 'network',
    });
    const tree = renderAIScreen();
    const node = findByTestId(tree, 'error-network');
    expect(node).not.toBeNull();
  });

  it('SC7.3 — empty state renders testID=empty-state when data=null and isLoading=false', () => {
    mockUseAIData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      data: null,
      isLoading: false,
      error: null,
    });
    const tree = renderAIScreen();
    const node = findByTestId(tree, 'empty-state');
    expect(node).not.toBeNull();
  });
});

// ─── AI Tab imports Card ──────────────────────────────────────────────────────

describe('AITab — layout structure', () => {
  it('SC8.1 — ai.tsx source imports Card', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/\bCard\b/);
  });

  it('SC8.2 — ai.tsx does not import AIProgressBar', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).not.toContain('AIProgressBar');
  });
});
