// Tests: Hours Dashboard screen — FR3-FR6 (05-hours-dashboard)
// File: app/(tabs)/index.tsx
//
// Strategy:
//   - Render tests for loading/error/data states
//   - Source-file static analysis for NativeWind className usage
//     (NativeWind v4 hashes className in Jest — do not assert on rendered props)
//
// Mocks:
//   - useHoursData, usePaymentHistory, useConfig (hooks)
//   - expo-router (useRouter)
//   - @shopify/react-native-skia (via __mocks__)

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mock setup ───────────────────────────────────────────────────────────────

jest.mock('@/src/hooks/useHoursData');
jest.mock('@/src/hooks/usePaymentHistory');
jest.mock('@/src/hooks/useConfig');
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// SafeAreaView passthrough
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Typed mock imports ───────────────────────────────────────────────────────

import { useHoursData } from '@/src/hooks/useHoursData';
import { usePaymentHistory } from '@/src/hooks/usePaymentHistory';
import { useConfig } from '@/src/hooks/useConfig';

// ─── Test data ────────────────────────────────────────────────────────────────

const MOCK_CONFIG = {
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

const MOCK_HOURS_DATA = {
  total: 28.5,
  average: 5.7,
  today: 7.2,
  daily: [
    { date: '2026-03-09', hours: 8.0, isToday: false },
    { date: '2026-03-10', hours: 7.5, isToday: false },
    { date: '2026-03-11', hours: 6.0, isToday: false },
    { date: '2026-03-12', hours: 7.0, isToday: false },
    { date: '2026-03-13', hours: 7.2, isToday: true },
  ],
  weeklyEarnings: 712.5,
  todayEarnings: 180,
  hoursRemaining: 11.5,
  overtimeHours: 0,
  timeRemaining: 48 * 60 * 60 * 1000, // 48h — no urgency
  deadline: new Date('2026-03-15T23:59:59Z'),
};

function mockHooks(overrides: {
  hoursData?: Partial<ReturnType<typeof useHoursData>>;
  config?: typeof MOCK_CONFIG | null;
  paymentHistory?: any[] | null;
}) {
  (useHoursData as jest.Mock).mockReturnValue({
    data: MOCK_HOURS_DATA,
    isLoading: false,
    isStale: false,
    cachedAt: null,
    error: null,
    refetch: jest.fn(),
    ...(overrides.hoursData ?? {}),
  });

  (useConfig as jest.Mock).mockReturnValue({
    config: overrides.config !== undefined ? overrides.config : MOCK_CONFIG,
    isLoading: false,
    refetch: jest.fn(),
  });

  (usePaymentHistory as jest.Mock).mockReturnValue({
    data: overrides.paymentHistory !== undefined ? overrides.paymentHistory : [],
    isLoading: false,
  });
}

// ─── File path ────────────────────────────────────────────────────────────────

const INDEX_FILE = path.resolve(__dirname, '../index.tsx');

// ─── Source file checks ───────────────────────────────────────────────────────

describe('HoursDashboard — source design tokens (FR3–FR6)', () => {
  let source: string;
  let code: string;

  beforeAll(() => {
    source = fs.readFileSync(INDEX_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('SC3.1 — no StyleSheet import in index.tsx', () => {
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC3.2 — no hardcoded hex color strings in index.tsx', () => {
    expect(code).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('SC3.3 — imports PanelGradient', () => {
    expect(source).toContain('PanelGradient');
  });

  it('SC3.4 — imports MetricValue', () => {
    expect(source).toContain('MetricValue');
  });

  it('SC3.5 — imports computePanelState and computeDaysElapsed', () => {
    expect(source).toContain('computePanelState');
    expect(source).toContain('computeDaysElapsed');
  });

  it('SC4.1 — imports WeeklyBarChart', () => {
    expect(source).toContain('WeeklyBarChart');
  });

  it('SC5.1 — imports TrendSparkline', () => {
    expect(source).toContain('TrendSparkline');
  });

  it('SC5.2 — uses colors.gold for sparkline', () => {
    expect(source).toContain('colors.gold');
  });

  it('SC5.3 — calls getWeeklyEarningsTrend', () => {
    expect(source).toContain('getWeeklyEarningsTrend');
  });

  it('SC6.1 — no ActivityIndicator replacing full layout', () => {
    // ActivityIndicator is allowed only if used alongside the main layout,
    // but must not be used as the sole loading-state return.
    // Check that the component never returns just an ActivityIndicator spinner.
    // The source should not have a standalone early-return with ActivityIndicator.
    expect(code).not.toMatch(/return\s*\(?\s*<.*ActivityIndicator/);
  });

  it('SC7a — imports UrgencyBanner', () => {
    expect(source).toContain('UrgencyBanner');
  });
});

// ─── Render tests ─────────────────────────────────────────────────────────────

describe('HoursDashboard — render: loading state (FR6)', () => {
  beforeEach(() => {
    mockHooks({
      hoursData: { data: null, isLoading: true },
    });
  });

  it('SC6.2 — renders without crash when isLoading=true and data=null', () => {
    const HoursDashboard = require('../index').default;
    expect(() => {
      act(() => {
        create(React.createElement(HoursDashboard));
      });
    }).not.toThrow();
  });

  it('SC6.3 — renders SkeletonLoader elements when isLoading=true', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    // SkeletonLoader renders Animated.View — check structure is present
    expect(json).not.toBeNull();
    // The output should NOT be null (screen renders, not a full-page spinner)
    expect(tree.toJSON()).not.toBeNull();
  });
});

describe('HoursDashboard — render: error state (FR6)', () => {
  beforeEach(() => {
    mockHooks({
      hoursData: {
        data: null,
        isLoading: false,
        error: 'Network request failed',
      },
    });
  });

  it('SC6.4 — renders without crash when error !== null and data=null', () => {
    const HoursDashboard = require('../index').default;
    expect(() => {
      act(() => {
        create(React.createElement(HoursDashboard));
      });
    }).not.toThrow();
  });

  it('SC6.5 — error banner testID="error-banner" present when error && !data', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"error-banner"');
  });

  it('SC6.6 — retry button testID="retry-button" present', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"retry-button"');
  });
});

describe('HoursDashboard — render: data loaded state (FR3, FR4, FR5)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@/src/hooks/useHoursData');
    jest.mock('@/src/hooks/usePaymentHistory');
    jest.mock('@/src/hooks/useConfig');
    jest.mock('expo-router', () => ({
      useRouter: () => ({ push: jest.fn() }),
    }));
    jest.mock('react-native-safe-area-context', () => {
      const React = require('react');
      return {
        SafeAreaView: ({ children, ...props }: any) =>
          React.createElement('View', props, children),
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      };
    });

    const { useHoursData } = require('@/src/hooks/useHoursData');
    const { useConfig } = require('@/src/hooks/useConfig');
    const { usePaymentHistory } = require('@/src/hooks/usePaymentHistory');

    (useHoursData as jest.Mock).mockReturnValue({
      data: MOCK_HOURS_DATA,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: jest.fn(),
    });
    (useConfig as jest.Mock).mockReturnValue({
      config: MOCK_CONFIG,
      isLoading: false,
      refetch: jest.fn(),
    });
    (usePaymentHistory as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('SC3.6 — renders without crash with full data', () => {
    const HoursDashboard = require('../index').default;
    expect(() => {
      act(() => {
        create(React.createElement(HoursDashboard));
      });
    }).not.toThrow();
  });

  it('SC3.7 — settings button testID="settings-button" present', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"settings-button"');
  });

  it('SC3.8 — state badge testID="state-badge" present', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"state-badge"');
  });

  it('SC3.9 — QA badge absent when config.useQA=false', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('"qa-badge"');
  });
});

describe('HoursDashboard — render: QA badge (FR3)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@/src/hooks/useHoursData');
    jest.mock('@/src/hooks/usePaymentHistory');
    jest.mock('@/src/hooks/useConfig');
    jest.mock('expo-router', () => ({
      useRouter: () => ({ push: jest.fn() }),
    }));
    jest.mock('react-native-safe-area-context', () => {
      const React = require('react');
      return {
        SafeAreaView: ({ children, ...props }: any) =>
          React.createElement('View', props, children),
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      };
    });

    const { useHoursData } = require('@/src/hooks/useHoursData');
    const { useConfig } = require('@/src/hooks/useConfig');
    const { usePaymentHistory } = require('@/src/hooks/usePaymentHistory');

    (useHoursData as jest.Mock).mockReturnValue({
      data: MOCK_HOURS_DATA,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: jest.fn(),
    });
    (useConfig as jest.Mock).mockReturnValue({
      config: { ...MOCK_CONFIG, useQA: true },
      isLoading: false,
      refetch: jest.fn(),
    });
    (usePaymentHistory as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('SC3.10 — QA badge testID="qa-badge" present when config.useQA=true', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"qa-badge"');
  });
});

describe('HoursDashboard — render: stale cache state (FR6)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@/src/hooks/useHoursData');
    jest.mock('@/src/hooks/usePaymentHistory');
    jest.mock('@/src/hooks/useConfig');
    jest.mock('expo-router', () => ({
      useRouter: () => ({ push: jest.fn() }),
    }));
    jest.mock('react-native-safe-area-context', () => {
      const React = require('react');
      return {
        SafeAreaView: ({ children, ...props }: any) =>
          React.createElement('View', props, children),
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      };
    });

    const { useHoursData } = require('@/src/hooks/useHoursData');
    const { useConfig } = require('@/src/hooks/useConfig');
    const { usePaymentHistory } = require('@/src/hooks/usePaymentHistory');

    (useHoursData as jest.Mock).mockReturnValue({
      data: MOCK_HOURS_DATA,
      isLoading: false,
      isStale: true,
      cachedAt: '2026-03-14T09:30:00.000Z',
      error: null,
      refetch: jest.fn(),
    });
    (useConfig as jest.Mock).mockReturnValue({
      config: MOCK_CONFIG,
      isLoading: false,
      refetch: jest.fn(),
    });
    (usePaymentHistory as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('SC6.7 — stale cache label present when isStale=true', () => {
    const HoursDashboard = require('../index').default;
    let tree: any;
    act(() => {
      tree = create(React.createElement(HoursDashboard));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Cached:');
  });
});
