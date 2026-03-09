// FR5 Tests: Hours Dashboard Screen
// Uses react-test-renderer pattern (matches existing project tests)

import React from 'react';
import { create, act } from 'react-test-renderer';

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
  Link: ({ children }: { children: React.ReactNode }) => children,
  useSegments: jest.fn(() => []),
  Href: String,
}));

// Mock useHoursData hook
jest.mock('../../src/hooks/useHoursData', () => ({
  useHoursData: jest.fn(),
}));

// Mock useConfig hook
jest.mock('../../src/hooks/useConfig', () => ({
  useConfig: jest.fn(),
}));

import { useHoursData } from '../../src/hooks/useHoursData';
import { useConfig } from '../../src/hooks/useConfig';
import HoursDashboard from '../../app/(tabs)/index';

const mockConfig = {
  userId: '2362707',
  fullName: 'Test User',
  managerId: '2372227',
  primaryTeamId: '4584',
  hourlyRate: 25,
  weeklyLimit: 40,
  useQA: false,
  isManager: false,
  assignmentId: '79996',
  teams: [],
  lastRoleCheck: new Date().toISOString(),
  debugMode: false,
  setupComplete: true,
  setupDate: new Date().toISOString(),
};

const mockHoursData = {
  total: 32,
  average: 6.4,
  today: 7.5,
  daily: [
    { date: '2026-03-02', hours: 6, isToday: false },
    { date: '2026-03-03', hours: 7, isToday: false },
    { date: '2026-03-04', hours: 7.5, isToday: true },
    { date: '2026-03-05', hours: 0, isToday: false },
    { date: '2026-03-06', hours: 0, isToday: false },
    { date: '2026-03-07', hours: 0, isToday: false },
    { date: '2026-03-08', hours: 0, isToday: false },
  ],
  weeklyEarnings: 800,
  todayEarnings: 187.5,
  hoursRemaining: 8,
  overtimeHours: 0,
  timeRemaining: 20 * 60 * 60 * 1000, // 20h remaining
  deadline: new Date('2026-03-08T23:59:59Z'),
};

const mockRefetch = jest.fn();

function renderDashboard() {
  let tree: any;
  act(() => {
    tree = create(React.createElement(HoursDashboard));
  });
  return tree;
}

describe('HoursDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue({
      config: mockConfig,
      isLoading: false,
    });
  });

  it('shows loading indicator when isLoading and no data', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"loading-indicator"');
  });

  it('does not show loading indicator when data is available', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('"loading-indicator"');
  });

  it('shows error message when error and no data', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: 'Network error',
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    // Should show some error text and retry button
    expect(text.toLowerCase()).toMatch(/error|failed|unable/);
  });

  it('shows Retry button when error and no data', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: 'Network error',
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text.toLowerCase()).toContain('retry');
  });

  it('shows "Cached:" label when isStale=true', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: true,
      cachedAt: '2026-03-04T10:00:00.000Z',
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text.toLowerCase()).toContain('cached');
  });

  it('does not show Cached label when isStale=false', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON()).toLowerCase();
    expect(text).not.toContain('cached:');
  });

  it('shows overtime text when overtimeHours > 0', () => {
    const overtimeData = { ...mockHoursData, overtimeHours: 5, hoursRemaining: 0 };
    (useHoursData as jest.Mock).mockReturnValue({
      data: overtimeData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON()).toLowerCase();
    expect(text).toContain('overtime');
  });

  it('shows "remaining" when overtimeHours === 0', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON()).toLowerCase();
    expect(text).toContain('remaining');
  });

  it('shows QA badge when config.useQA=true', () => {
    (useConfig as jest.Mock).mockReturnValue({
      config: { ...mockConfig, useQA: true },
      isLoading: false,
    });
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"qa-badge"');
  });

  it('hides QA badge when config.useQA=false', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('"qa-badge"');
  });

  it('renders Hourglass title in header', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Hourglass');
  });

  it('renders hero total hours testID when data available', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"hero-total-hours"');
  });

  it('renders hero weekly earnings testID when data available', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const tree = renderDashboard();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"hero-weekly-earnings"');
  });
});
