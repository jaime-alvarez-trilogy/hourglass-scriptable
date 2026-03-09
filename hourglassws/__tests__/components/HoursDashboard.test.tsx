// FR5 Tests: Hours Dashboard Screen
// TDD red phase — screen and hooks do not exist yet

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

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

describe('HoursDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue({
      config: mockConfig,
      isLoading: false,
    });
  });

  it('shows ActivityIndicator when isLoading and no data', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<HoursDashboard />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
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

    const { queryByTestId } = render(<HoursDashboard />);
    expect(queryByTestId('loading-indicator')).toBeNull();
  });

  it('shows error message and Retry button when error and no data', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: 'Network error',
      refetch: mockRefetch,
    });

    const { getByText } = render(<HoursDashboard />);
    expect(getByText(/error|failed|unable/i)).toBeTruthy();
    expect(getByText(/retry/i)).toBeTruthy();
  });

  it('calls refetch when Retry button is pressed', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: 'Network error',
      refetch: mockRefetch,
    });

    const { getByText } = render(<HoursDashboard />);
    fireEvent.press(getByText(/retry/i));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
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

    const { getByText } = render(<HoursDashboard />);
    expect(getByText(/cached:/i)).toBeTruthy();
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

    const { queryByText } = render(<HoursDashboard />);
    expect(queryByText(/cached:/i)).toBeNull();
  });

  it('shows overtime label when overtimeHours > 0', () => {
    const overtimeData = { ...mockHoursData, overtimeHours: 5, hoursRemaining: 0 };
    (useHoursData as jest.Mock).mockReturnValue({
      data: overtimeData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HoursDashboard />);
    expect(getByText(/overtime/i)).toBeTruthy();
  });

  it('shows remaining hours label when overtimeHours === 0', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HoursDashboard />);
    expect(getByText(/remaining/i)).toBeTruthy();
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

    const { getByTestId } = render(<HoursDashboard />);
    expect(getByTestId('qa-badge')).toBeTruthy();
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

    const { queryByTestId } = render(<HoursDashboard />);
    expect(queryByTestId('qa-badge')).toBeNull();
  });

  it('renders total hours in hero section', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<HoursDashboard />);
    expect(getByTestId('hero-total-hours')).toBeTruthy();
  });

  it('renders weekly earnings in hero section', () => {
    (useHoursData as jest.Mock).mockReturnValue({
      data: mockHoursData,
      isLoading: false,
      isStale: false,
      cachedAt: null,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<HoursDashboard />);
    expect(getByTestId('hero-weekly-earnings')).toBeTruthy();
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

    const { getByText } = render(<HoursDashboard />);
    expect(getByText('Hourglass')).toBeTruthy();
  });
});
