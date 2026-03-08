// FR10: useRoleRefresh — guard logic + refresh action (src/hooks/useRoleRefresh.ts)
import { shouldRunRoleRefresh, runRoleRefresh } from '../src/hooks/useRoleRefresh';
import { QueryClient } from '@tanstack/react-query';
import type { CrossoverConfig } from '../src/types/config';

// Mock auth and store modules
jest.mock('../src/api/auth', () => ({
  getProfileDetail: jest.fn(),
}));
jest.mock('../src/store/config', () => ({
  ...jest.requireActual('../src/store/config'),
  saveConfig: jest.fn(),
}));

const { getProfileDetail } = require('../src/api/auth');
const { saveConfig } = require('../src/store/config');
const mockGetProfileDetail = getProfileDetail as jest.MockedFunction<typeof getProfileDetail>;
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>;

const MONDAY = new Date('2026-01-05T12:00:00'); // Monday
const TUESDAY = new Date('2026-01-06T12:00:00'); // Tuesday
const EIGHT_DAYS_AGO = new Date(MONDAY.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
const THREE_DAYS_AGO = new Date(MONDAY.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
const EXACTLY_SEVEN_DAYS = new Date(MONDAY.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

const MOCK_CREDS = { username: 'user@test.com', password: 'pass' };
const MOCK_TOKEN = 'auth-token';

const makeConfig = (overrides: Partial<CrossoverConfig> = {}): CrossoverConfig => ({
  userId: '2362707',
  fullName: 'Jane Doe',
  managerId: '2372227',
  primaryTeamId: '4584',
  assignmentId: '79996',
  hourlyRate: 50,
  weeklyLimit: 40,
  useQA: false,
  isManager: false,
  teams: [{ id: '4584', name: 'Team Alpha', company: '' }],
  lastRoleCheck: EIGHT_DAYS_AGO,
  setupComplete: true,
  setupDate: '2026-01-01T00:00:00.000Z',
  debugMode: false,
  ...overrides,
});

const makeDetailResponse = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Jane Doe',
  avatarTypes: ['CANDIDATE'],
  assignment: {
    id: 79996,
    salary: 60,
    weeklyLimit: 35,
    team: { id: 4584, name: 'Team Alpha' },
    manager: { id: 2372227 },
  },
  userAvatars: [{ avatarType: 'CANDIDATE', id: 2362707 }],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveConfig.mockResolvedValue(undefined);
});

// --- Guard Logic (pure function) ---

describe('FR10: shouldRunRoleRefresh guard', () => {
  it('returns false when today is not Monday (Tuesday)', () => {
    expect(shouldRunRoleRefresh(EIGHT_DAYS_AGO, TUESDAY)).toBe(false);
  });

  it('returns false when today is not Monday (Wednesday)', () => {
    const wednesday = new Date('2026-01-07T12:00:00');
    expect(shouldRunRoleRefresh(EIGHT_DAYS_AGO, wednesday)).toBe(false);
  });

  it('returns false when lastRoleCheck was within the last 7 days', () => {
    expect(shouldRunRoleRefresh(THREE_DAYS_AGO, MONDAY)).toBe(false);
  });

  it('returns false when lastRoleCheck was exactly 7 days ago (exclusive boundary)', () => {
    expect(shouldRunRoleRefresh(EXACTLY_SEVEN_DAYS, MONDAY)).toBe(false);
  });

  it('returns true when it IS Monday AND lastRoleCheck is more than 7 days ago', () => {
    expect(shouldRunRoleRefresh(EIGHT_DAYS_AGO, MONDAY)).toBe(true);
  });

  it('returns true on Monday when lastRoleCheck is absent (treated as overdue)', () => {
    expect(shouldRunRoleRefresh(undefined, MONDAY)).toBe(true);
  });

  it('returns false on Tuesday even when lastRoleCheck is absent', () => {
    expect(shouldRunRoleRefresh(undefined, TUESDAY)).toBe(false);
  });
});

// --- Refresh Action (integration) ---

describe('FR10: runRoleRefresh action', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    jest.spyOn(queryClient, 'invalidateQueries');
  });

  it('calls getProfileDetail with the stored token', async () => {
    mockGetProfileDetail.mockResolvedValueOnce(makeDetailResponse());
    const config = makeConfig();

    await runRoleRefresh(queryClient, config, MOCK_CREDS);

    expect(mockGetProfileDetail).toHaveBeenCalledWith(
      expect.any(String), // token derived from credentials
      config.useQA,
    );
  });

  it('updates isManager from fresh detail response', async () => {
    mockGetProfileDetail.mockResolvedValueOnce(
      makeDetailResponse({ avatarTypes: ['CANDIDATE', 'MANAGER'] }),
    );
    const config = makeConfig({ isManager: false });

    await runRoleRefresh(queryClient, config, MOCK_CREDS);

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ isManager: true }),
    );
  });

  it('updates hourlyRate, weeklyLimit, and lastRoleCheck on success', async () => {
    mockGetProfileDetail.mockResolvedValueOnce(
      makeDetailResponse(), // salary: 60, weeklyLimit: 35
    );
    const config = makeConfig({ hourlyRate: 50, weeklyLimit: 40 });

    await runRoleRefresh(queryClient, config, MOCK_CREDS);

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        hourlyRate: 60,
        weeklyLimit: 35,
        lastRoleCheck: expect.any(String),
      }),
    );
  });

  it('invalidates ["config"] query after writing updated fields', async () => {
    mockGetProfileDetail.mockResolvedValueOnce(makeDetailResponse());
    const config = makeConfig();

    await runRoleRefresh(queryClient, config, MOCK_CREDS);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['config'] }),
    );
  });

  it('silently swallows errors and does NOT update lastRoleCheck on failure', async () => {
    mockGetProfileDetail.mockRejectedValueOnce(new Error('network down'));
    const config = makeConfig();

    // Should NOT throw
    await expect(runRoleRefresh(queryClient, config, MOCK_CREDS)).resolves.toBeUndefined();
    // Should NOT update config when error occurred
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it('does not call getProfileDetail when credentials are missing', async () => {
    await runRoleRefresh(queryClient, makeConfig(), null);
    expect(mockGetProfileDetail).not.toHaveBeenCalled();
  });
});
