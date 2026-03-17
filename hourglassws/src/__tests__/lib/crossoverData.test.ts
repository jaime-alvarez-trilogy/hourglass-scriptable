/**
 * FR2: fetchFreshData() tests
 * Tests for src/lib/crossoverData.ts
 */

// ─── Mocks (hoisting-safe factories) ─────────────────────────────────────────

jest.mock('../../store/config', () => ({
  loadConfig: jest.fn(),
  loadCredentials: jest.fn(),
}));

jest.mock('../../api/client', () => ({
  getAuthToken: jest.fn(),
}));

jest.mock('../../api/timesheet', () => ({
  fetchTimesheet: jest.fn(),
}));

jest.mock('../../api/payments', () => ({
  fetchPayments: jest.fn(),
}));

jest.mock('../../api/workDiary', () => ({
  fetchWorkDiary: jest.fn(),
}));

jest.mock('../../api/approvals', () => ({
  fetchPendingManual: jest.fn(),
  fetchPendingOvertime: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../lib/hours', () => ({
  calculateHours: jest.fn(),
  getWeekStartDate: jest.fn(),
}));

jest.mock('../../lib/ai', () => ({
  countDiaryTags: jest.fn(),
  aggregateAICache: jest.fn(),
}));

jest.mock('../../lib/approvals', () => ({
  parseManualItems: jest.fn(),
  parseOvertimeItems: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { fetchFreshData } from '../../lib/crossoverData';
import { loadConfig, loadCredentials } from '../../store/config';
import { getAuthToken } from '../../api/client';
import { fetchTimesheet } from '../../api/timesheet';
import { fetchPayments } from '../../api/payments';
import { fetchWorkDiary } from '../../api/workDiary';
import { fetchPendingManual, fetchPendingOvertime } from '../../api/approvals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateHours, getWeekStartDate } from '../../lib/hours';
import { countDiaryTags, aggregateAICache } from '../../lib/ai';
import { parseManualItems, parseOvertimeItems } from '../../lib/approvals';

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockLoadConfig = loadConfig as jest.Mock;
const mockLoadCredentials = loadCredentials as jest.Mock;
const mockGetAuthToken = getAuthToken as jest.Mock;
const mockFetchTimesheet = fetchTimesheet as jest.Mock;
const mockFetchPayments = fetchPayments as jest.Mock;
const mockFetchWorkDiary = fetchWorkDiary as jest.Mock;
const mockFetchPendingManual = fetchPendingManual as jest.Mock;
const mockFetchPendingOvertime = fetchPendingOvertime as jest.Mock;
const mockAsyncStorageGetItem = AsyncStorage.getItem as jest.Mock;
const mockCalculateHours = calculateHours as jest.Mock;
const mockGetWeekStartDate = getWeekStartDate as jest.Mock;
const mockCountDiaryTags = countDiaryTags as jest.Mock;
const mockAggregateAICache = aggregateAICache as jest.Mock;
const mockParseManualItems = parseManualItems as jest.Mock;
const mockParseOvertimeItems = parseOvertimeItems as jest.Mock;

// ─── Test fixtures ────────────────────────────────────────────────────────────

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

const MOCK_CREDENTIALS = {
  username: 'test@example.com',
  password: 'secret123',
};

const MOCK_TIMESHEET = {
  totalHours: 32.5,
  averageHoursPerDay: 6.5,
  stats: [{ date: '2026-03-17', hours: 6.5 }],
};

const MOCK_PAYMENTS = {
  paidHours: 32.5,
  workedHours: 32.5,
  amount: 812.5,
};

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

const MOCK_WORK_DIARY_SLOTS = [
  { autoTracker: true, status: 'APPROVED', tags: ['ai_usage'], durationMinutes: 10 },
  { autoTracker: true, status: 'APPROVED', tags: ['second_brain'], durationMinutes: 10 },
];

const MOCK_TAG_DATA = { total: 2, aiUsage: 2, secondBrain: 1, noTags: 0 };

const MOCK_AI_WEEK_DATA = {
  aiPctLow: 73,
  aiPctHigh: 77,
  brainliftHours: 0.2,
  totalSlots: 20,
  taggedSlots: 18,
  workdaysElapsed: 3,
  dailyBreakdown: [],
};

const MOCK_MANUAL_RAW = [{ userId: 12345, fullName: 'Worker A', manualTimes: [{ status: 'PENDING', durationMinutes: 60, description: 'Fix', startDateTime: '2026-03-17T10:00:00Z', timecardIds: [1], type: 'WEB' }] }];
const MOCK_OVERTIME_RAW = [{ overtimeRequest: { id: 99, status: 'PENDING', durationMinutes: 30, description: 'OT', startDateTime: '2026-03-17T18:00:00Z' }, assignment: { candidate: { fullName: 'Worker B' } } }];
const MOCK_MANUAL_ITEMS = [{ id: 'manual-1', category: 'MANUAL', startDateTime: '2026-03-17T10:00:00Z', timecardIds: [1] }];
const MOCK_OVERTIME_ITEMS = [{ id: 'overtime-99', category: 'OVERTIME', startDateTime: '2026-03-17T18:00:00Z', overtimeId: 99 }];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default happy-path returns
  mockLoadConfig.mockResolvedValue(MOCK_CONFIG);
  mockLoadCredentials.mockResolvedValue(MOCK_CREDENTIALS);
  mockGetAuthToken.mockResolvedValue('token-abc123');
  mockGetWeekStartDate.mockReturnValue('2026-03-16');
  mockFetchTimesheet.mockResolvedValue(MOCK_TIMESHEET);
  mockFetchPayments.mockResolvedValue(MOCK_PAYMENTS);
  mockCalculateHours.mockReturnValue(MOCK_HOURS_DATA);
  mockAsyncStorageGetItem.mockResolvedValue(null);
  mockFetchWorkDiary.mockResolvedValue(MOCK_WORK_DIARY_SLOTS);
  mockCountDiaryTags.mockReturnValue(MOCK_TAG_DATA);
  mockAggregateAICache.mockReturnValue(MOCK_AI_WEEK_DATA);
  mockFetchPendingManual.mockResolvedValue(MOCK_MANUAL_RAW);
  mockFetchPendingOvertime.mockResolvedValue(MOCK_OVERTIME_RAW);
  mockParseManualItems.mockReturnValue(MOCK_MANUAL_ITEMS);
  mockParseOvertimeItems.mockReturnValue(MOCK_OVERTIME_ITEMS);
});

// ─── FR2: Happy Path ──────────────────────────────────────────────────────────

describe('FR2: fetchFreshData — happy path', () => {
  it('returns CrossoverSnapshot with hoursData, aiData, pendingCount, config', async () => {
    const result = await fetchFreshData();

    expect(result).toMatchObject({
      hoursData: MOCK_HOURS_DATA,
      aiData: MOCK_AI_WEEK_DATA,
      pendingCount: 2, // 1 manual + 1 overtime
      config: MOCK_CONFIG,
    });
  });

  it('calls getAuthToken with credentials from loadCredentials', async () => {
    await fetchFreshData();

    expect(mockGetAuthToken).toHaveBeenCalledWith(
      MOCK_CREDENTIALS.username,
      MOCK_CREDENTIALS.password,
      MOCK_CONFIG.useQA
    );
  });

  it('fetches timesheet and payments in parallel (both called in Promise.all)', async () => {
    const callOrder: string[] = [];
    mockFetchTimesheet.mockImplementation(async () => {
      callOrder.push('timesheet');
      return MOCK_TIMESHEET;
    });
    mockFetchPayments.mockImplementation(async () => {
      callOrder.push('payments');
      return MOCK_PAYMENTS;
    });

    await fetchFreshData();

    expect(callOrder).toContain('timesheet');
    expect(callOrder).toContain('payments');
    expect(mockFetchTimesheet).toHaveBeenCalledTimes(1);
    expect(mockFetchPayments).toHaveBeenCalledTimes(1);
  });

  it('calls calculateHours with timesheet and payments results', async () => {
    await fetchFreshData();

    expect(mockCalculateHours).toHaveBeenCalledWith(
      MOCK_TIMESHEET,
      MOCK_PAYMENTS,
      MOCK_CONFIG.hourlyRate,
      MOCK_CONFIG.weeklyLimit
    );
  });

  it('reads ai_cache from AsyncStorage and merges with fresh work diary slots', async () => {
    const existingCache = { '2026-03-16': { total: 30, aiUsage: 20, secondBrain: 5, noTags: 5 } };
    mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify(existingCache));

    await fetchFreshData();

    expect(mockAsyncStorageGetItem).toHaveBeenCalledWith('ai_cache');
    expect(mockCountDiaryTags).toHaveBeenCalledWith(MOCK_WORK_DIARY_SLOTS);
    // aggregateAICache called with merged cache (existing + today)
    const aggregateCall = mockAggregateAICache.mock.calls[0];
    expect(aggregateCall[0]).toHaveProperty('2026-03-16');
    expect(aggregateCall[0]).toHaveProperty(expect.any(String)); // today key merged in
  });

  it('calls aggregateAICache with merged cache and today date string', async () => {
    await fetchFreshData();

    expect(mockAggregateAICache).toHaveBeenCalledTimes(1);
    const [mergedCache, today] = mockAggregateAICache.mock.calls[0];
    expect(typeof mergedCache).toBe('object');
    expect(typeof today).toBe('string');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
  });

  it('manager: calls fetchPendingManual and fetchPendingOvertime, returns sum as pendingCount', async () => {
    // MOCK_CONFIG.isManager = true by default
    // parseManualItems returns 1 item, parseOvertimeItems returns 1 item → pendingCount = 2
    const result = await fetchFreshData();

    expect(mockFetchPendingManual).toHaveBeenCalledTimes(1);
    expect(mockFetchPendingOvertime).toHaveBeenCalledTimes(1);
    expect(result.pendingCount).toBe(2);
  });

  it('non-manager: skips approval fetch, returns pendingCount = 0', async () => {
    mockLoadConfig.mockResolvedValue({ ...MOCK_CONFIG, isManager: false });

    const result = await fetchFreshData();

    expect(mockFetchPendingManual).not.toHaveBeenCalled();
    expect(mockFetchPendingOvertime).not.toHaveBeenCalled();
    expect(result.pendingCount).toBe(0);
  });
});

// ─── FR2: Throws on missing config/credentials ────────────────────────────────

describe('FR2: fetchFreshData — config/credentials guards', () => {
  it('throws a descriptive error when loadConfig returns null', async () => {
    mockLoadConfig.mockResolvedValue(null);

    await expect(fetchFreshData()).rejects.toThrow(/config/i);
  });

  it('throws a descriptive error when loadCredentials returns null', async () => {
    mockLoadCredentials.mockResolvedValue(null);

    await expect(fetchFreshData()).rejects.toThrow(/credentials/i);
  });
});

// ─── FR2: Non-fatal error paths ───────────────────────────────────────────────

describe('FR2: fetchFreshData — non-fatal error paths', () => {
  it('fetchTimesheet throws → calculateHours called with null timesheet (no total throw)', async () => {
    mockFetchTimesheet.mockRejectedValue(new Error('Network error'));

    const result = await fetchFreshData();

    expect(mockCalculateHours).toHaveBeenCalledWith(
      null,
      expect.anything(), // payments may still succeed
      MOCK_CONFIG.hourlyRate,
      MOCK_CONFIG.weeklyLimit
    );
    expect(result).toHaveProperty('hoursData');
  });

  it('fetchPayments throws → calculateHours called with null payments (no total throw)', async () => {
    mockFetchPayments.mockRejectedValue(new Error('Network error'));

    const result = await fetchFreshData();

    expect(mockCalculateHours).toHaveBeenCalledWith(
      expect.anything(), // timesheet may still succeed
      null,
      MOCK_CONFIG.hourlyRate,
      MOCK_CONFIG.weeklyLimit
    );
    expect(result).toHaveProperty('hoursData');
  });

  it('fetchWorkDiary throws → aiData is null in snapshot (non-fatal)', async () => {
    mockFetchWorkDiary.mockRejectedValue(new Error('Work diary unavailable'));

    const result = await fetchFreshData();

    expect(result.aiData).toBeNull();
  });

  it('AsyncStorage.getItem returns null → empty cache; aggregates today-only data', async () => {
    mockAsyncStorageGetItem.mockResolvedValue(null);

    await fetchFreshData();

    // aggregateAICache called with a cache that only contains today's data
    expect(mockAggregateAICache).toHaveBeenCalledTimes(1);
    const [mergedCache] = mockAggregateAICache.mock.calls[0];
    // Should contain today's key but no prior history
    const keys = Object.keys(mergedCache);
    expect(keys).toHaveLength(1);
  });

  it('fetchPendingManual throws (manager) → pendingCount uses overtime only, no throw', async () => {
    mockFetchPendingManual.mockRejectedValue(new Error('403 Forbidden'));
    // overtime still succeeds with 1 item
    mockParseOvertimeItems.mockReturnValue(MOCK_OVERTIME_ITEMS);

    const result = await fetchFreshData();

    // Function should not throw
    expect(result).toHaveProperty('pendingCount');
    // parseManualItems should not have been called (raw was null/failed)
    // pendingCount comes from overtime only = 1
    expect(result.pendingCount).toBe(1);
  });

  it('both approval fetches throw (manager) → pendingCount = 0, no throw', async () => {
    mockFetchPendingManual.mockRejectedValue(new Error('403'));
    mockFetchPendingOvertime.mockRejectedValue(new Error('403'));

    const result = await fetchFreshData();

    expect(result.pendingCount).toBe(0);
  });

  it('ai_cache contains corrupt JSON → treated as empty cache', async () => {
    mockAsyncStorageGetItem.mockResolvedValue('{invalid json}');

    // Should not throw — fallback to empty cache
    const result = await fetchFreshData();

    expect(result).toHaveProperty('hoursData');
  });
});
