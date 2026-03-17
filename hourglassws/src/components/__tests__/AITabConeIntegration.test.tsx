// Tests: AI Tab screen — 03-ai-tab-integration
// FR1: Prime Radiant card wired into app/(tabs)/ai.tsx
//
// Strategy:
// - Source-file static analysis for import/structure checks (NativeWind v4 hashes className)
// - Mock useAIData, useConfig, useFocusKey, AIConeChart, computeAICone, SkeletonLoader
// - Render tests via react-test-renderer for structural behavior
// - testID and component-type assertions for runtime structural checks

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── File path ────────────────────────────────────────────────────────────────

// __dirname = hourglassws/src/components/__tests__
// ../../.. = hourglassws
const HOURGLASSWS_ROOT = path.resolve(__dirname, '../../..');
const AI_TAB_PATH = path.join(HOURGLASSWS_ROOT, 'app', '(tabs)', 'ai.tsx');

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-web/dist/exports/View/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      R.createElement('View', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/ScrollView/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, refreshControl, ...rest }: any) =>
      R.createElement('ScrollView', { testID, style, ...rest }, children),
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

jest.mock('react-native-web/dist/exports/TouchableOpacity/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, onPress, style, ...rest }: any) =>
      R.createElement('TouchableOpacity', { testID, onPress, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/TextInput/index.js', () => {
  const R = require('react');
  const mockRN = jest.requireActual('react-native-web');
  return {
    __esModule: true,
    default: ({ defaultValue, value, ...props }: any) =>
      R.createElement(mockRN.View, props,
        R.createElement(mockRN.Text, null, defaultValue ?? value ?? '')
      ),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

// Stub design-system components that use Reanimated/Skia (tested individually)
jest.mock('@/src/components/SkeletonLoader', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ width, height, rounded, ...props }: any) =>
      R.createElement('SkeletonLoader', { width, height, rounded, ...props }),
  };
});

jest.mock('@/src/components/MetricValue', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ value, unit, ...props }: any) =>
      R.createElement('MetricValue', { value, unit, ...props }),
  };
});

jest.mock('@/src/components/ProgressBar', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ progress, ...props }: any) =>
      R.createElement('ProgressBar', { progress, ...props }),
  };
});

jest.mock('@/src/components/AIRingChart', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ aiPercent, brainliftPercent, size, ...props }: any) =>
      R.createElement('AIRingChart', { aiPercent, brainliftPercent, size, ...props }),
  };
});

// AIConeChart — mock to a testable element to verify props without Skia
jest.mock('@/src/components/AIConeChart', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ data, width, height, size, ...props }: any) =>
      R.createElement('AIConeChart', { data, width, height, size, ...props }),
    AIConeChart: ({ data, width, height, size, ...props }: any) =>
      R.createElement('AIConeChart', { data, width, height, size, ...props }),
  };
});

// computeAICone — mock to return a known ConeData object
const MOCK_CONE_DATA = {
  actualPoints: [{ hoursX: 0, pctY: 0 }, { hoursX: 10, pctY: 78 }],
  upperBound: [{ hoursX: 10, pctY: 78 }, { hoursX: 40, pctY: 95 }],
  lowerBound: [{ hoursX: 10, pctY: 78 }, { hoursX: 40, pctY: 55 }],
  currentHours: 10,
  currentAIPct: 78,
  weeklyLimit: 40,
  targetPct: 75,
  isTargetAchievable: true,
};

const mockComputeAICone = jest.fn(() => MOCK_CONE_DATA);
jest.mock('@/src/lib/aiCone', () => ({
  computeAICone: (...args: any[]) => mockComputeAICone(...args),
}));

// useFocusKey — mock to return a stable key (0)
// Also mock @react-navigation/native since useFocusKey uses useIsFocused which
// requires a NavigationContainer — not available in jest-expo/node environment
const mockUseFocusKey = jest.fn(() => 0);
jest.mock('@/src/hooks/useFocusKey', () => ({
  useFocusKey: () => mockUseFocusKey(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

// useConfig — mock returning config with weeklyLimit
const mockUseConfig = jest.fn();
jest.mock('@/src/hooks/useConfig', () => ({
  useConfig: (...args: any[]) => mockUseConfig(...args),
}));

// useAIData mock
const mockUseAIData = jest.fn();
jest.mock('@/src/hooks/useAIData', () => ({
  useAIData: (...args: any[]) => mockUseAIData(...args),
}));

// useHistoryBackfill + useOverviewData — stub for AI trajectory card
jest.mock('@/src/hooks/useHistoryBackfill', () => ({
  useHistoryBackfill: () => null,
}));

jest.mock('@/src/hooks/useOverviewData', () => ({
  useOverviewData: () => ({
    data: {
      earnings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      aiPct: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      brainliftHours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      weekLabels: [],
    },
    isLoading: false,
  }),
}));

jest.mock('@/src/components/TrendSparkline', () => {
  const mockR = require('react');
  return {
    __esModule: true,
    default: ({ data, width, height, color, ...props }: any) =>
      mockR.createElement('TrendSparkline', { data, width, height, color, ...props }),
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DAILY_BREAKDOWN = [
  { date: '2026-03-09', total: 45, aiUsage: 38, secondBrain: 12, noTags: 4, isToday: false },
  { date: '2026-03-10', total: 43, aiUsage: 35, secondBrain: 9,  noTags: 3, isToday: false },
  { date: '2026-03-11', total: 46, aiUsage: 39, secondBrain: 0,  noTags: 2, isToday: true  },
];

const DEFAULT_AI_DATA = {
  aiPctLow: 73,
  aiPctHigh: 77,
  brainliftHours: 3.5,
  totalSlots: 180,
  taggedSlots: 160,
  workdaysElapsed: 4,
  dailyBreakdown: DAILY_BREAKDOWN,
};

const DEFAULT_CONFIG = {
  weeklyLimit: 40,
  useQA: false,
  hourlyRate: 25,
  userId: 'u1',
  fullName: 'Test User',
  managerId: 'm1',
  primaryTeamId: 't1',
  teams: [],
  isManager: false,
  assignmentId: 'a1',
  lastRoleCheck: '',
  debugMode: false,
  setupComplete: true,
  setupDate: '',
};

function defaultHookResults() {
  mockUseAIData.mockReturnValue({
    data: DEFAULT_AI_DATA,
    isLoading: false,
    lastFetchedAt: null,
    error: null,
    refetch: jest.fn(),
    previousWeekPercent: undefined,
  });
  mockUseConfig.mockReturnValue({
    config: DEFAULT_CONFIG,
    isLoading: false,
    refetch: jest.fn(),
  });
}

// ─── Screen import (after all mocks are declared) ─────────────────────────────

import AIScreen from '@/app/(tabs)/ai';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAIScreen(): any {
  let tree: any;
  act(() => {
    tree = create(React.createElement(AIScreen));
  });
  return tree;
}

function findByType(node: any, type: string): any {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (node.type === type) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findByType(child, type);
      if (found) return found;
    }
  }
  return null;
}

function findAllByType(node: any, type: string, collected: any[] = []): any[] {
  if (!node) return collected;
  if (Array.isArray(node)) {
    for (const child of node) findAllByType(child, type, collected);
    return collected;
  }
  if (node.type === type) collected.push(node);
  if (node.children) {
    for (const child of node.children) findAllByType(child, type, collected);
  }
  return collected;
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

function allText(tree: any): string {
  const collected: string[] = [];
  collectText(tree.toJSON(), collected);
  return collected.join(' ');
}

function collectText(node: any, collected: string[]): void {
  if (!node) return;
  if (typeof node === 'string') { collected.push(node); return; }
  if (Array.isArray(node)) { for (const c of node) collectText(c, collected); return; }
  if (node.children) { for (const c of node.children) collectText(c, collected); }
}

// ─── FR1: Prime Radiant Card — Source Structure ───────────────────────────────

describe('AITab FR1 — source: imports and structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(AI_TAB_PATH, 'utf8');
  });

  it('SC1.1 — imports AIConeChart from @/src/components/AIConeChart', () => {
    expect(source).toContain('AIConeChart');
    expect(source).toMatch(/from\s+['"]@\/src\/components\/AIConeChart['"]/);
  });

  it('SC1.2 — imports computeAICone from @/src/lib/aiCone', () => {
    expect(source).toContain('computeAICone');
    expect(source).toMatch(/from\s+['"]@\/src\/lib\/aiCone['"]/);
  });

  it('SC1.3 — imports useFocusKey from @/src/hooks/useFocusKey', () => {
    expect(source).toContain('useFocusKey');
    expect(source).toMatch(/from\s+['"]@\/src\/hooks\/useFocusKey['"]/);
  });

  it('SC1.4 — imports useConfig from @/src/hooks/useConfig', () => {
    expect(source).toContain('useConfig');
    expect(source).toMatch(/from\s+['"]@\/src\/hooks\/useConfig['"]/);
  });

  it('SC1.5 — uses useMemo (imported from react)', () => {
    expect(source).toMatch(/\buseMemo\b/);
  });

  it('SC1.6 — derives weeklyLimit from config.weeklyLimit', () => {
    expect(source).toMatch(/weeklyLimit\s*=\s*config\?\.weeklyLimit/);
  });

  it('SC1.7 — calls computeAICone with dailyBreakdown and weeklyLimit', () => {
    expect(source).toMatch(/computeAICone\s*\(\s*data\s*[\?.]?\s*\.?\s*dailyBreakdown|computeAICone\s*\([^)]*dailyBreakdown[^)]*weeklyLimit/);
  });

  it('SC1.8 — renders PRIME RADIANT section label text', () => {
    expect(source).toContain('PRIME RADIANT');
  });

  it('SC1.9 — renders AIConeChart with size="full"', () => {
    expect(source).toMatch(/size\s*=\s*['"]full['"]/);
  });

  it('SC1.10 — renders AIConeChart with height={240}', () => {
    expect(source).toMatch(/height\s*=\s*\{?\s*240\s*\}?/);
  });

  it('SC1.11 — uses SkeletonLoader with height={240} for Prime Radiant skeleton', () => {
    // Source should have a SkeletonLoader height=240 for the cone card skeleton
    expect(source).toMatch(/SkeletonLoader[\s\S]{0,100}height\s*=\s*\{240\}/);
  });
});

// ─── FR1: Prime Radiant Card — Render: happy path ────────────────────────────

describe('AITab FR1 — render: Prime Radiant card with data', () => {
  beforeEach(() => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    defaultHookResults();
  });

  it('SC1.12 — renders without crash when data is available', () => {
    expect(() => { renderAIScreen(); }).not.toThrow();
  });

  it('SC1.13 — renders PRIME RADIANT text in output', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text).toContain('PRIME RADIANT');
  });

  it('SC1.14 — renders AIConeChart component when coneData is available', () => {
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).not.toBeNull();
  });

  it('SC1.15 — AIConeChart receives size="full"', () => {
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).not.toBeNull();
    expect(coneChart.props.size).toBe('full');
  });

  it('SC1.16 — AIConeChart receives height={240}', () => {
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).not.toBeNull();
    expect(coneChart.props.height).toBe(240);
  });

  it('SC1.17 — AIConeChart receives the ConeData object from computeAICone', () => {
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).not.toBeNull();
    expect(coneChart.props.data).toBe(MOCK_CONE_DATA);
  });

  it('SC1.18 — computeAICone called with dailyBreakdown and weeklyLimit=40', () => {
    renderAIScreen();
    expect(mockComputeAICone).toHaveBeenCalledWith(
      DAILY_BREAKDOWN,
      40,
    );
  });
});

// ─── FR1: Prime Radiant Card — Render: skeleton during initial load ───────────

describe('AITab FR1 — render: skeleton during initial load', () => {
  beforeEach(() => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    mockUseConfig.mockReturnValue({
      config: DEFAULT_CONFIG,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseAIData.mockReturnValue({
      data: null,
      isLoading: true,
      lastFetchedAt: null,
      error: null,
      refetch: jest.fn(),
      previousWeekPercent: undefined,
    });
  });

  it('SC1.19 — does not crash when data=null and isLoading=true', () => {
    expect(() => { renderAIScreen(); }).not.toThrow();
  });

  it('SC1.20 — renders a SkeletonLoader for the Prime Radiant section when loading', () => {
    const tree = renderAIScreen();
    const skeletons = findAllByType(tree.toJSON(), 'SkeletonLoader');
    // At least one SkeletonLoader with height=240 (Prime Radiant slot)
    const coneSkeletons = skeletons.filter((s: any) => s.props.height === 240);
    expect(coneSkeletons.length).toBeGreaterThan(0);
  });

  it('SC1.21 — does NOT render AIConeChart when data=null', () => {
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).toBeNull();
  });
});

// ─── FR1: Prime Radiant Card — Render: null guard when data=null, not loading ─

describe('AITab FR1 — render: no cone card when data=null and not loading', () => {
  beforeEach(() => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    mockUseConfig.mockReturnValue({
      config: DEFAULT_CONFIG,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseAIData.mockReturnValue({
      data: null,
      isLoading: false,
      lastFetchedAt: null,
      error: null,
      refetch: jest.fn(),
      previousWeekPercent: undefined,
    });
  });

  it('SC1.22 — does NOT render AIConeChart when data=null and isLoading=false', () => {
    // When data=null and isLoading=false, the screen shows empty-state (no chart)
    const tree = renderAIScreen();
    const coneChart = findByType(tree.toJSON(), 'AIConeChart');
    expect(coneChart).toBeNull();
  });
});

// ─── FR1: Prime Radiant Card — weeklyLimit from useConfig ────────────────────

describe('AITab FR1 — weeklyLimit sourced from useConfig', () => {
  it('SC1.23 — computeAICone called with weeklyLimit=30 when config.weeklyLimit=30', () => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    mockUseConfig.mockReturnValue({
      config: { ...DEFAULT_CONFIG, weeklyLimit: 30 },
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseAIData.mockReturnValue({
      data: DEFAULT_AI_DATA,
      isLoading: false,
      lastFetchedAt: null,
      error: null,
      refetch: jest.fn(),
      previousWeekPercent: undefined,
    });

    renderAIScreen();

    expect(mockComputeAICone).toHaveBeenCalledWith(
      expect.anything(),
      30,
    );
  });
});

// ─── FR1: Prime Radiant Card — chartKey from useFocusKey ─────────────────────

describe('AITab FR1 — source: chartKey prop on AIConeChart', () => {
  it('SC1.24 — ai.tsx source passes key={chartKey} to AIConeChart', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    // chartKey is used as the key prop on AIConeChart
    expect(source).toMatch(/AIConeChart[\s\S]{0,300}key\s*=\s*\{chartKey\}/);
  });

  it('SC1.25 — ai.tsx source calls useFocusKey() and assigns chartKey', () => {
    const source = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(source).toMatch(/chartKey\s*=\s*useFocusKey\s*\(\s*\)/);
  });
});

// ─── FR1: Prime Radiant Card — render order (below BrainLift, above breakdown) ─

describe('AITab FR1 — render order: Prime Radiant between BrainLift and breakdown', () => {
  beforeEach(() => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    defaultHookResults();
  });

  it('SC1.26 — BRAINLIFT text appears before PRIME RADIANT in render output', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    const brainliftIdx = text.indexOf('BRAINLIFT');
    const primeIdx = text.indexOf('PRIME RADIANT');
    expect(brainliftIdx).toBeGreaterThanOrEqual(0);
    expect(primeIdx).toBeGreaterThanOrEqual(0);
    expect(brainliftIdx).toBeLessThan(primeIdx);
  });
});

// ─── FR12 (02-safe-cone-scrub): Animation gate — integration surface ──────────
//
// Verifies that the scrub gate in AIConeChart does not break the integration:
// - ai.tsx still passes onScrubChange to AIConeChart
// - AIConeChart still accepts onScrubChange (no prop API change)
// - No crashes when AIConeChart receives animDone gate internally
//
// NOTE: GestureDetector mock and useAnimatedReaction NOOP mean we cannot
// test the gate timing behaviourally here. Source-level structural checks
// are used per the same strategy as all existing integration tests.

const CONE_CHART_FILE_INTEGRATION = path.join(
  path.resolve(__dirname, '../../..'),
  'src',
  'components',
  'AIConeChart.tsx',
);

describe('AITab × AIConeChart — FR12 (02-safe-cone-scrub): animation gate integration', () => {
  beforeEach(() => {
    mockComputeAICone.mockReturnValue(MOCK_CONE_DATA);
    mockUseFocusKey.mockReturnValue(0);
    defaultHookResults();
  });

  it('SC12.I1 — AIConeChart still receives onScrubChange from ai.tsx after gate addition', () => {
    // Source check: ai.tsx must still pass onScrubChange to AIConeChart
    const aiTabSource = fs.readFileSync(AI_TAB_PATH, 'utf8');
    expect(aiTabSource).toMatch(/onScrubChange/);
  });

  it('SC12.I2 — AIConeChartProps interface still has onScrubChange (no prop removal)', () => {
    const coneSource = fs.readFileSync(CONE_CHART_FILE_INTEGRATION, 'utf8');
    // onScrubChange must still be in AIConeChartProps
    expect(coneSource).toMatch(/onScrubChange\s*\?\s*:/);
  });

  it('SC12.I3 — AIConeChart renders without crash after gate addition (full integration)', () => {
    expect(() => { renderAIScreen(); }).not.toThrow();
  });

  it('SC12.I4 — PRIME RADIANT section still renders after gate addition', () => {
    const tree = renderAIScreen();
    const text = allText(tree);
    expect(text).toContain('PRIME RADIANT');
  });

  it('SC12.I5 — animDone state is purely internal (no new props on AIConeChartProps)', () => {
    const coneSource = fs.readFileSync(CONE_CHART_FILE_INTEGRATION, 'utf8');
    // AIConeChartProps interface must NOT contain animDone as a prop
    const interfaceMatch = coneSource.match(/interface\s+AIConeChartProps\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![0]).not.toMatch(/animDone/);
  });

  it('SC12.I6 — source: GestureDetector in AIConeChart has enabled prop (gate present)', () => {
    const coneSource = fs.readFileSync(CONE_CHART_FILE_INTEGRATION, 'utf8');
    // Gate must be on GestureDetector — enabled={animDone && size === 'full'}
    expect(coneSource).toMatch(/GestureDetector[\s\S]{0,200}enabled\s*=\s*\{/);
  });

  it('SC12.I7 — source: both useAnimatedReaction callbacks have !animDone guard', () => {
    const coneSource = fs.readFileSync(CONE_CHART_FILE_INTEGRATION, 'utf8');
    // At least 2 occurrences of !animDone guard in reactions
    const guards = [...coneSource.matchAll(/!\s*animDone/g)];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });
});
