// FR4 Tests: StatCard, DailyBarChart, UrgencyBanner components
// TDD red phase — components do not exist yet

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatCard } from '../../src/components/StatCard';
import { DailyBarChart } from '../../src/components/DailyBarChart';
import { UrgencyBanner } from '../../src/components/UrgencyBanner';
import type { DailyEntry } from '../../src/lib/hours';

// ─── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders the label', () => {
    const { getByText } = render(<StatCard label="Weekly Hours" value="32.5" />);
    expect(getByText('Weekly Hours')).toBeTruthy();
  });

  it('renders the value', () => {
    const { getByText } = render(<StatCard label="Weekly Hours" value="32.5" />);
    expect(getByText('32.5')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <StatCard label="Today" value="6.0h" subtitle="$150" />
    );
    expect(getByText('$150')).toBeTruthy();
  });

  it('does not render subtitle element when not provided', () => {
    const { queryByTestId } = render(
      <StatCard label="Today" value="6.0h" testID="stat-card" />
    );
    expect(queryByTestId('stat-card-subtitle')).toBeNull();
  });

  it('accepts a testID prop', () => {
    const { getByTestId } = render(
      <StatCard label="Avg" value="5h" testID="avg-card" />
    );
    expect(getByTestId('avg-card')).toBeTruthy();
  });
});

// ─── DailyBarChart ────────────────────────────────────────────────────────────

const makeDailyEntries = (): DailyEntry[] => [
  { date: '2026-03-02', hours: 4, isToday: false }, // Mon
  { date: '2026-03-03', hours: 6, isToday: false }, // Tue
  { date: '2026-03-04', hours: 8, isToday: true },  // Wed (today)
  { date: '2026-03-05', hours: 2, isToday: false }, // Thu
  { date: '2026-03-06', hours: 0, isToday: false }, // Fri
  { date: '2026-03-07', hours: 0, isToday: false }, // Sat
  { date: '2026-03-08', hours: 0, isToday: false }, // Sun
];

describe('DailyBarChart', () => {
  it('renders 7 columns (Mon–Sun)', () => {
    const { getAllByTestId } = render(
      <DailyBarChart daily={makeDailyEntries()} weeklyLimit={40} />
    );
    expect(getAllByTestId('bar-column')).toHaveLength(7);
  });

  it('shows day-letter labels', () => {
    const { getByText } = render(
      <DailyBarChart daily={makeDailyEntries()} weeklyLimit={40} />
    );
    expect(getByText('M')).toBeTruthy();
    expect(getByText('T')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
  });

  it('shows hours value above each bar', () => {
    const { getByText } = render(
      <DailyBarChart daily={makeDailyEntries()} weeklyLimit={40} />
    );
    // Today's bar should show 8
    expect(getByText('8')).toBeTruthy();
    // A zero entry shows "–"
    const dashes = getAllByTestId ? null : null;
    // At least verify we can find the "–" for zero hours
    expect(getByText('–')).toBeTruthy();
  });

  it('applies accent color to today bar', () => {
    const { getAllByTestId } = render(
      <DailyBarChart daily={makeDailyEntries()} weeklyLimit={40} />
    );
    const columns = getAllByTestId('bar-column');
    // Today is index 2 (Wed). We can't easily assert color in RNTU,
    // but we can verify the testID 'bar-today' exists
    const todayBar = getAllByTestId('bar-today');
    expect(todayBar).toHaveLength(1);
  });

  it('renders with empty daily array without crashing', () => {
    expect(() =>
      render(<DailyBarChart daily={[]} weeklyLimit={40} />)
    ).not.toThrow();
  });
});

// ─── UrgencyBanner ────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;

describe('UrgencyBanner', () => {
  it('renders null when urgency is "none" (> 12h remaining)', () => {
    const { toJSON } = render(<UrgencyBanner timeRemaining={13 * HOUR_MS} />);
    expect(toJSON()).toBeNull();
  });

  it('renders countdown string when urgency is "low"', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={6 * HOUR_MS} />);
    const banner = getByTestId('urgency-banner');
    expect(banner).toBeTruthy();
  });

  it('renders countdown string when urgency is "high"', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={2 * HOUR_MS} />);
    expect(getByTestId('urgency-banner')).toBeTruthy();
  });

  it('renders countdown string when urgency is "critical"', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={30 * 60 * 1000} />);
    expect(getByTestId('urgency-banner')).toBeTruthy();
  });

  it('renders banner when expired (negative timeRemaining)', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={-1 * HOUR_MS} />);
    expect(getByTestId('urgency-banner')).toBeTruthy();
  });

  it('shows "Expired" text when timeRemaining is negative', () => {
    const { getByText } = render(<UrgencyBanner timeRemaining={-1 * HOUR_MS} />);
    expect(getByText('Expired')).toBeTruthy();
  });

  it('applies yellow background for low urgency', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={6 * HOUR_MS} />);
    const banner = getByTestId('urgency-banner');
    const style = banner.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toMatch(/yellow|#[Ff][Ff][CcDdEeFf]/i);
  });

  it('applies orange background for high urgency', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={2 * HOUR_MS} />);
    const banner = getByTestId('urgency-banner');
    const style = banner.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toMatch(/orange|#[Ff][Ff]/i);
  });

  it('applies red background for critical urgency', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={30 * 60 * 1000} />);
    const banner = getByTestId('urgency-banner');
    const style = banner.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toMatch(/red|#[Ff][Ff]0000|#[Cc][Cc]0000/i);
  });

  it('applies red background for expired state', () => {
    const { getByTestId } = render(<UrgencyBanner timeRemaining={-1} />);
    const banner = getByTestId('urgency-banner');
    const style = banner.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toMatch(/red|#[Ff][Ff]0000|#[Cc][Cc]0000/i);
  });
});
