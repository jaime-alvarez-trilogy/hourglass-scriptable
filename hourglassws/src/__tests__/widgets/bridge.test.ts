/**
 * FR1, FR2, FR3: Widget Data Bridge tests
 * Tests for src/widgets/bridge.ts: updateWidgetData, buildTimelineEntries, readWidgetData
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Platform to control iOS vs Android branching
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Mock expo-widgets — iOS-only module
jest.mock('expo-widgets', () => ({}), { virtual: true });

// Mock @react-native-async-storage/async-storage is handled by jest-expo preset

// ─── Fixtures ─────────────────────────────────────────────────────────────────

import type { HoursData } from '../../lib/hours';
import type { AIWeekData } from '../../lib/ai';
import type { CrossoverConfig } from '../../types/config';

const NOW = new Date('2026-03-10T10:00:00.000Z').getTime(); // Monday 10am UTC

const DEADLINE = new Date('2026-03-15T23:59:59.000Z').getTime(); // Sunday end of week

/** Minimal valid HoursData fixture */
function makeHoursData(overrides: Partial<HoursData> = {}): HoursData {
  return {
    total: 32.5,
    average: 6.5,
    today: 6.2,
    daily: [
      { date: '2026-03-09', hours: 6.1, isToday: false },
      { date: '2026-03-10', hours: 6.2, isToday: true },
    ],
    weeklyEarnings: 1300,
    todayEarnings: 248,
    hoursRemaining: 7.5,
    overtimeHours: 0,
    timeRemaining: DEADLINE - NOW,
    deadline: new Date(DEADLINE),
    ...overrides,
  };
}

/** Minimal valid AIWeekData fixture */
function makeAIData(overrides: Partial<AIWeekData> = {}): AIWeekData {
  return {
    aiPctLow: 71,
    aiPctHigh: 75,
    brainliftHours: 3.2,
    totalSlots: 200,
    taggedSlots: 180,
    workdaysElapsed: 2,
    dailyBreakdown: [],
    ...overrides,
  };
}

/** Minimal valid CrossoverConfig fixture */
function makeConfig(overrides: Partial<CrossoverConfig> = {}): CrossoverConfig {
  return {
    userId: '2362707',
    fullName: 'Test User',
    managerId: '2372227',
    primaryTeamId: '4584',
    teams: [],
    hourlyRate: 40,
    weeklyLimit: 40,
    useQA: false,
    isManager: false,
    assignmentId: '79996',
    lastRoleCheck: '2026-03-10T00:00:00.000Z',
    debugMode: false,
    setupComplete: true,
    setupDate: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── FR1: updateWidgetData ─────────────────────────────────────────────────────

describe('updateWidgetData (FR1)', () => {
  let updateWidgetData: typeof import('../../widgets/bridge').updateWidgetData;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    // Re-import after resetModules so Platform mock applies fresh
    ({ updateWidgetData } = await import('../../widgets/bridge'));
  });

  it('builds WidgetData and writes to AsyncStorage on Android', async () => {
    const hoursData = makeHoursData();
    const aiData = makeAIData();
    const config = makeConfig();

    await updateWidgetData(hoursData, aiData, 0, config);

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    );
    expect(raw).toBeDefined();

    const parsed = JSON.parse(raw[1]);
    expect(parsed.hours).toBe('32.5');
    expect(parsed.earnings).toMatch(/\$1,300/);
    expect(parsed.today).toBe('6.2h');
    expect(parsed.isManager).toBe(false);
    expect(parsed.useQA).toBe(false);
  });

  it('formats hours as string with 1 decimal', async () => {
    const hoursData = makeHoursData({ total: 8 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.hours).toBe('8.0');
    expect(parsed.hoursDisplay).toBe('8.0h');
  });

  it('formats earnings with $ and comma separator', async () => {
    const hoursData = makeHoursData({ weeklyEarnings: 1300 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.earnings).toBe('$1,300');
  });

  it('formats earnings without comma for amounts < 1000', async () => {
    const hoursData = makeHoursData({ weeklyEarnings: 800 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.earnings).toBe('$800');
  });

  it('sets pendingCount to 0 for contributors (isManager false)', async () => {
    const config = makeConfig({ isManager: false });
    await updateWidgetData(makeHoursData(), makeAIData(), 5, config);

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.pendingCount).toBe(0);
  });

  it('passes pendingCount through for managers', async () => {
    const config = makeConfig({ isManager: true });
    await updateWidgetData(makeHoursData(), makeAIData(), 3, config);

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.pendingCount).toBe(3);
    expect(parsed.isManager).toBe(true);
  });

  it('sets cachedAt to current timestamp', async () => {
    const before = Date.now();
    await updateWidgetData(makeHoursData(), makeAIData(), 0, makeConfig());
    const after = Date.now();

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.cachedAt).toBeGreaterThanOrEqual(before);
    expect(parsed.cachedAt).toBeLessThanOrEqual(after);
  });

  it('sets urgency based on getUrgencyLevel(deadline - now)', async () => {
    // Far from deadline (>12h remaining) → urgency 'none'
    const hoursData = makeHoursData({
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
    });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.urgency).toBe('none');
  });

  it('sets urgency to expired when deadline is in the past', async () => {
    const hoursData = makeHoursData({
      deadline: new Date(Date.now() - 1000), // 1 second ago
    });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.urgency).toBe('expired');
  });

  it('sets aiPct to N/A and brainlift to 0.0h when aiData is null', async () => {
    await updateWidgetData(makeHoursData(), null, 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.aiPct).toBe('N/A');
    expect(parsed.brainlift).toBe('0.0h');
  });

  it('formats aiPct as range string when aiData provided', async () => {
    const aiData = makeAIData({ aiPctLow: 71, aiPctHigh: 75 });
    await updateWidgetData(makeHoursData(), aiData, 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.aiPct).toBe('71%\u201375%'); // en-dash
  });

  it('formats brainlift hours as string with 1 decimal', async () => {
    const aiData = makeAIData({ brainliftHours: 3.2 });
    await updateWidgetData(makeHoursData(), aiData, 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.brainlift).toBe('3.2h');
  });

  it('shows hoursRemaining as "Xh left" when not in overtime', async () => {
    const hoursData = makeHoursData({ hoursRemaining: 7.5, overtimeHours: 0 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.hoursRemaining).toMatch(/7\.5h left/);
  });

  it('shows hoursRemaining as "Xh OT" when in overtime', async () => {
    const hoursData = makeHoursData({ hoursRemaining: 0, overtimeHours: 2.5 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(parsed.hoursRemaining).toMatch(/2\.5h OT/);
  });

  it('stores earningsRaw as number', async () => {
    const hoursData = makeHoursData({ weeklyEarnings: 1300 });
    await updateWidgetData(hoursData, makeAIData(), 0, makeConfig());

    const raw = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'widget_data'
    )!;
    const parsed = JSON.parse(raw[1]);
    expect(typeof parsed.earningsRaw).toBe('number');
    expect(parsed.earningsRaw).toBe(1300);
  });
});

// ─── FR2: buildTimelineEntries ─────────────────────────────────────────────────

describe('buildTimelineEntries (FR2)', () => {
  let buildTimelineEntries: typeof import('../../widgets/bridge').buildTimelineEntries;

  beforeAll(async () => {
    ({ buildTimelineEntries } = await import('../../widgets/bridge'));
  });

  function makeBaseData() {
    return {
      hours: '32.5',
      hoursDisplay: '32.5h',
      earnings: '$1,300',
      earningsRaw: 1300,
      today: '6.2h',
      hoursRemaining: '7.5h left',
      aiPct: '71%\u201375%',
      brainlift: '3.2h',
      deadline: Date.now() + 6 * 60 * 60 * 1000, // 6h from now
      urgency: 'high' as const,
      pendingCount: 0,
      isManager: false,
      cachedAt: Date.now(),
      useQA: false,
    };
  }

  it('returns exactly count entries (default 60)', () => {
    const entries = buildTimelineEntries(makeBaseData());
    expect(entries).toHaveLength(60);
  });

  it('returns exactly count entries when count specified', () => {
    const entries = buildTimelineEntries(makeBaseData(), 10);
    expect(entries).toHaveLength(10);
  });

  it('first entry date is >= now', () => {
    const before = Date.now();
    const entries = buildTimelineEntries(makeBaseData(), 5);
    expect(entries[0].date.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('each subsequent entry is intervalMinutes after previous (default 15)', () => {
    const entries = buildTimelineEntries(makeBaseData(), 5);
    const interval = 15 * 60 * 1000;
    for (let i = 1; i < entries.length; i++) {
      const diff = entries[i].date.getTime() - entries[i - 1].date.getTime();
      expect(diff).toBe(interval);
    }
  });

  it('each subsequent entry is intervalMinutes after previous (custom 30)', () => {
    const entries = buildTimelineEntries(makeBaseData(), 4, 30);
    const interval = 30 * 60 * 1000;
    for (let i = 1; i < entries.length; i++) {
      const diff = entries[i].date.getTime() - entries[i - 1].date.getTime();
      expect(diff).toBe(interval);
    }
  });

  it('non-time-dependent fields are identical across all entries', () => {
    const entries = buildTimelineEntries(makeBaseData(), 5);
    const first = entries[0].props;
    for (const entry of entries) {
      expect(entry.props.hours).toBe(first.hours);
      expect(entry.props.earnings).toBe(first.earnings);
      expect(entry.props.aiPct).toBe(first.aiPct);
      expect(entry.props.brainlift).toBe(first.brainlift);
      expect(entry.props.earningsRaw).toBe(first.earningsRaw);
    }
  });

  it('urgency field updates as entries advance toward deadline', () => {
    // Deadline is 6h from now, entries at 15min intervals
    // Early entries: >3h remaining → 'high', later entries: <1h → 'critical', past → 'expired'
    const base = makeBaseData(); // deadline 6h from now, urgency 'high'
    const entries = buildTimelineEntries(base, 60, 15);

    // Entry 0 (now): 6h remaining → 'high'
    expect(['high', 'low', 'none']).toContain(entries[0].props.urgency);

    // Entry 24 (6h later = 360min = past deadline): should be 'expired'
    expect(entries[entries.length - 1].props.urgency).toBe('expired');
  });

  it('entries past deadline have urgency expired', () => {
    // Deadline is 1 minute from now — almost all entries will be past it
    const base = { ...makeBaseData(), deadline: Date.now() + 60 * 1000 };
    const entries = buildTimelineEntries(base, 5, 15);
    // Entry 1+ are all 15min past deadline
    expect(entries[1].props.urgency).toBe('expired');
    expect(entries[4].props.urgency).toBe('expired');
  });
});

// ─── FR3: readWidgetData ──────────────────────────────────────────────────────

describe('readWidgetData (FR3)', () => {
  let readWidgetData: typeof import('../../widgets/bridge').readWidgetData;

  beforeAll(async () => {
    ({ readWidgetData } = await import('../../widgets/bridge'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when key is absent', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await readWidgetData();
    expect(result).toBeNull();
  });

  it('returns parsed WidgetData when key is present and JSON is valid', async () => {
    const data = {
      hours: '32.5',
      hoursDisplay: '32.5h',
      earnings: '$1,300',
      earningsRaw: 1300,
      today: '6.2h',
      hoursRemaining: '7.5h left',
      aiPct: '71%\u201375%',
      brainlift: '3.2h',
      deadline: DEADLINE,
      urgency: 'none',
      pendingCount: 0,
      isManager: false,
      cachedAt: Date.now(),
      useQA: false,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(data));

    const result = await readWidgetData();
    expect(result).not.toBeNull();
    expect(result!.hours).toBe('32.5');
    expect(result!.earnings).toBe('$1,300');
    expect(result!.pendingCount).toBe(0);
  });

  it('returns null when JSON is malformed (does not throw)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{ invalid json }}}');
    await expect(readWidgetData()).resolves.toBeNull();
  });

  it('returns null when AsyncStorage.getItem throws (does not throw)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(readWidgetData()).resolves.toBeNull();
  });

  it('reads from key widget_data', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await readWidgetData();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('widget_data');
  });
});
