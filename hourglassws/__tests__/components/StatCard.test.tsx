// FR4 Tests: StatCard, DailyBarChart, UrgencyBanner components
// Uses react-test-renderer pattern (matches existing project tests)

import React from 'react';
import { create, act } from 'react-test-renderer';
import { StatCard } from '../../src/components/StatCard';
import { DailyBarChart } from '../../src/components/DailyBarChart';
import { UrgencyBanner } from '../../src/components/UrgencyBanner';
import type { DailyEntry } from '../../src/lib/hours';

// ─── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders the label', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(StatCard, { label: 'Weekly Hours', value: '32.5' }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Weekly Hours');
  });

  it('renders the value', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(StatCard, { label: 'Weekly Hours', value: '32.5' }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('32.5');
  });

  it('renders subtitle when provided', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(StatCard, { label: 'Today', value: '6.0h', subtitle: '$150' }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('$150');
  });

  it('does not render subtitle when not provided', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(StatCard, { label: 'Today', value: '6.0h' }));
    });
    // Only 2 children: label + value (no subtitle)
    const json = tree.toJSON();
    const childCount = json.children?.length ?? 0;
    expect(childCount).toBe(2);
  });

  it('accepts testID and renders it', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(StatCard, { label: 'Avg', value: '5h', testID: 'avg-card' }));
    });
    const text = JSON.stringify(tree.toJSON());
    // testID renders as data-testid in web/node renderer
    expect(text).toMatch(/avg-card/);
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
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(DailyBarChart, { daily: makeDailyEntries(), weeklyLimit: 40 })
      );
    });
    const json = tree.toJSON();
    // Container has 7 column children
    expect(json.children?.length).toBe(7);
  });

  it('shows day-letter labels (M, T, W, S)', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(DailyBarChart, { daily: makeDailyEntries(), weeklyLimit: 40 })
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"M"');
    expect(text).toContain('"W"');
    expect(text).toContain('"S"');
  });

  it('shows hours value above each bar (non-zero)', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(DailyBarChart, { daily: makeDailyEntries(), weeklyLimit: 40 })
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"8"'); // today's hours
  });

  it('shows "–" for zero-hour bars', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(DailyBarChart, { daily: makeDailyEntries(), weeklyLimit: 40 })
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('–');
  });

  it('applies accent color to today bar (bar-today testID exists)', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(DailyBarChart, { daily: makeDailyEntries(), weeklyLimit: 40 })
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"bar-today"');
  });

  it('renders with empty daily array without crashing', () => {
    expect(() => {
      act(() => {
        create(React.createElement(DailyBarChart, { daily: [], weeklyLimit: 40 }));
      });
    }).not.toThrow();
  });
});

// ─── UrgencyBanner ────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;

describe('UrgencyBanner', () => {
  it('renders null when urgency is "none" (> 12h remaining)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 13 * HOUR_MS }));
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders urgency-banner testID when urgency is "low"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 6 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"urgency-banner"');
  });

  it('renders urgency-banner testID when urgency is "high"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 2 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"urgency-banner"');
  });

  it('renders urgency-banner testID when urgency is "critical"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 30 * 60 * 1000 }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"urgency-banner"');
  });

  it('renders banner when expired (negative timeRemaining)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: -1 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"urgency-banner"');
  });

  it('shows "Expired" text when timeRemaining is negative', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: -1 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Expired');
  });

  it('applies yellow background for low urgency', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 6 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    // Yellow = #FFC107 → rendered as rgba(255,193,7,...) in node/web renderer
    expect(text).toMatch(/#FFC107|rgba\(255,193,7/i);
  });

  it('applies orange background for high urgency', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 2 * HOUR_MS }));
    });
    const text = JSON.stringify(tree.toJSON());
    // Orange = #FF9500 → rgba(255,149,0,...)
    expect(text).toMatch(/#FF9500|rgba\(255,149,0/i);
  });

  it('applies red background for critical urgency', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: 30 * 60 * 1000 }));
    });
    const text = JSON.stringify(tree.toJSON());
    // Red = #FF3B30 → rgba(255,59,48,...)
    expect(text).toMatch(/#FF3B30|rgba\(255,59,48/i);
  });

  it('applies red background for expired state', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(UrgencyBanner, { timeRemaining: -1 }));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toMatch(/#FF3B30|rgba\(255,59,48/i);
  });
});
