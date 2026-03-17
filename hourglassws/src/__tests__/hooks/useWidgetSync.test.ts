/**
 * FR5: useWidgetSync hook tests
 * Tests for src/hooks/useWidgetSync.ts
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../widgets/bridge', () => ({
  updateWidgetData: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useWidgetSync } from '../../hooks/useWidgetSync';
import * as widgetsBridge from '../../widgets/bridge';

const mockUpdateWidgetData = widgetsBridge.updateWidgetData as jest.Mock;

// ─── Test fixtures ────────────────────────────────────────────────────────────

const MOCK_HOURS_DATA = {
  total: 32.5,
  average: 6.5,
  today: 6.5,
  daily: [],
  weeklyEarnings: 812.5,
  todayEarnings: 162.5,
  hoursRemaining: 7.5,
  overtimeHours: 0,
  timeRemaining: 86400000,
  deadline: new Date('2026-03-22T23:59:59.000Z'),
};

const MOCK_AI_DATA = {
  aiPctLow: 73,
  aiPctHigh: 77,
  brainliftHours: 0.2,
  totalSlots: 20,
  taggedSlots: 18,
  workdaysElapsed: 3,
  dailyBreakdown: [],
};

const MOCK_CONFIG = {
  userId: '2362707',
  assignmentId: '79996',
  managerId: '2372227',
  primaryTeamId: '4584',
  hourlyRate: 25,
  weeklyLimit: 40,
  useQA: false,
  isManager: true,
  fullName: 'Test User',
  teams: [],
  lastRoleCheck: '2026-03-17T00:00:00.000Z',
  debugMode: false,
  setupComplete: true,
  setupDate: '2026-03-01T00:00:00.000Z',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateWidgetData.mockResolvedValue(undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FR5: useWidgetSync', () => {
  it('calls updateWidgetData on first render when hoursData and config are non-null', () => {
    renderHook(() =>
      useWidgetSync(MOCK_HOURS_DATA, MOCK_AI_DATA, 2, MOCK_CONFIG)
    );

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(1);
    expect(mockUpdateWidgetData).toHaveBeenCalledWith(
      MOCK_HOURS_DATA,
      MOCK_AI_DATA,
      2,
      MOCK_CONFIG
    );
  });

  it('does NOT call updateWidgetData when hoursData is null', () => {
    renderHook(() =>
      useWidgetSync(null, MOCK_AI_DATA, 0, MOCK_CONFIG)
    );

    expect(mockUpdateWidgetData).not.toHaveBeenCalled();
  });

  it('does NOT call updateWidgetData when config is null', () => {
    renderHook(() =>
      useWidgetSync(MOCK_HOURS_DATA, MOCK_AI_DATA, 0, null)
    );

    expect(mockUpdateWidgetData).not.toHaveBeenCalled();
  });

  it('calls updateWidgetData again when hoursData changes (new reference)', () => {
    const { rerender } = renderHook(
      ({ hoursData }) => useWidgetSync(hoursData, MOCK_AI_DATA, 0, MOCK_CONFIG),
      { initialProps: { hoursData: MOCK_HOURS_DATA } }
    );

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(1);

    const updatedHoursData = { ...MOCK_HOURS_DATA, total: 38.0 };
    rerender({ hoursData: updatedHoursData });

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(2);
  });

  it('calls updateWidgetData again when pendingCount changes', () => {
    const { rerender } = renderHook(
      ({ pendingCount }) =>
        useWidgetSync(MOCK_HOURS_DATA, MOCK_AI_DATA, pendingCount, MOCK_CONFIG),
      { initialProps: { pendingCount: 0 } }
    );

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(1);

    rerender({ pendingCount: 3 });

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(2);
    expect(mockUpdateWidgetData).toHaveBeenLastCalledWith(
      MOCK_HOURS_DATA,
      MOCK_AI_DATA,
      3,
      MOCK_CONFIG
    );
  });

  it('passes aiData = null to updateWidgetData when aiData is null (not blocked)', () => {
    renderHook(() =>
      useWidgetSync(MOCK_HOURS_DATA, null, 0, MOCK_CONFIG)
    );

    expect(mockUpdateWidgetData).toHaveBeenCalledTimes(1);
    expect(mockUpdateWidgetData).toHaveBeenCalledWith(
      MOCK_HOURS_DATA,
      null,
      0,
      MOCK_CONFIG
    );
  });

  it('does not throw when updateWidgetData rejects (error is swallowed)', async () => {
    mockUpdateWidgetData.mockRejectedValue(new Error('Widget write failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // renderHook should not throw even when updateWidgetData rejects
    expect(() => {
      renderHook(() =>
        useWidgetSync(MOCK_HOURS_DATA, MOCK_AI_DATA, 0, MOCK_CONFIG)
      );
    }).not.toThrow();

    // Allow promise rejection to propagate and be caught
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // console.error should have been called with the error
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not call updateWidgetData when both hoursData and config are null', () => {
    renderHook(() =>
      useWidgetSync(null, null, 0, null)
    );

    expect(mockUpdateWidgetData).not.toHaveBeenCalled();
  });
});
