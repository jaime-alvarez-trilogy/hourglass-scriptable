// FR5: fetchAndBuildConfig + extractConfigFromDetail (src/api/auth.ts)
import { fetchAndBuildConfig } from '../src/api/auth';
import { AuthError, NetworkError } from '../src/api/errors';
import * as client from '../src/api/client';

jest.mock('../src/api/client', () => ({
  getAuthToken: jest.fn(),
  apiGet: jest.fn(),
  apiPut: jest.fn(),
}));

const mockGetAuthToken = client.getAuthToken as jest.MockedFunction<typeof client.getAuthToken>;
const mockApiGet = client.apiGet as jest.MockedFunction<typeof client.apiGet>;

// Minimal valid DetailResponse shape matching the spec interface
const makeDetail = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Jane Doe',
  avatarTypes: ['CANDIDATE'],
  assignment: {
    id: 79996,
    salary: 50,
    weeklyLimit: 40,
    team: { id: 4584, name: 'Team Alpha' },
    manager: { id: 2372227 },
    selection: {
      marketplaceMember: {
        application: { candidate: { id: 9999 } },
      },
    },
  },
  userAvatars: [{ avatarType: 'CANDIDATE', id: 2362707 }],
  ...overrides,
});

const MOCK_TOKEN = 'token123';
const MOCK_PAYMENTS = [{ amount: 2000, currency: 'USD' }];

// Compute a 3-month-ago date in local YYYY-MM-DD for testing
function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthToken.mockResolvedValue(MOCK_TOKEN);
  mockApiGet
    .mockResolvedValueOnce(makeDetail()) // first call → detail
    .mockResolvedValueOnce(MOCK_PAYMENTS); // second call → payments
});

// --- ID Extraction ---

describe('FR5: extractConfigFromDetail — userId extraction', () => {
  it('extracts userId from userAvatars CANDIDATE entry', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.userId).toBe('2362707');
  });

  it('falls back to nested candidate.id when userAvatars absent', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail({ userAvatars: undefined }))
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.userId).toBe('9999');
  });

  it('falls back to nested candidate.id when userAvatars has no CANDIDATE entry', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail({ userAvatars: [{ avatarType: 'MANAGER', id: 111 }] }))
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.userId).toBe('9999');
  });

  it('falls back to "0" when both userId paths are absent', async () => {
    const detail = makeDetail({ userAvatars: undefined });
    detail.assignment.selection = undefined as never;
    mockApiGet
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.userId).toBe('0');
  });
});

describe('FR5: extractConfigFromDetail — other fields', () => {
  it('sets isManager: true when avatarTypes includes MANAGER', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail({ avatarTypes: ['CANDIDATE', 'MANAGER'] }))
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.isManager).toBe(true);
  });

  it('sets isManager: false when avatarTypes does not include MANAGER', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.isManager).toBe(false);
  });

  it('extracts assignmentId as string from assignment.id', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.assignmentId).toBe('79996');
  });

  it('extracts managerId as string from assignment.manager.id', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.managerId).toBe('2372227');
  });

  it('extracts primaryTeamId as string from assignment.team.id', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.primaryTeamId).toBe('4584');
  });

  it('uses assignment.salary for hourlyRate', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.hourlyRate).toBe(50);
  });

  it('defaults weeklyLimit to 40 when absent from response', async () => {
    const detail = makeDetail();
    delete (detail.assignment as Record<string, unknown>).weeklyLimit;
    mockApiGet
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.weeklyLimit).toBe(40);
  });

  it('builds teams array with id, name, and company empty string', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.teams).toEqual([
      { id: '4584', name: 'Team Alpha', company: '' },
    ]);
  });
});

// --- Happy Path ---

describe('FR5: fetchAndBuildConfig — happy path', () => {
  it('calls getAuthToken with provided username and password', async () => {
    await fetchAndBuildConfig('user@test.com', 'mypass', false);
    expect(mockGetAuthToken).toHaveBeenCalledWith('user@test.com', 'mypass', false);
  });

  it('calls apiGet for detail endpoint with the auth token', async () => {
    await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(mockApiGet).toHaveBeenNthCalledWith(
      1,
      '/api/identity/users/current/detail',
      {},
      MOCK_TOKEN,
      false,
    );
  });

  it('calls payments endpoint with local YYYY-MM-DD date range (not ISO)', async () => {
    await fetchAndBuildConfig('user@test.com', 'pass', false);
    const [path, params] = mockApiGet.mock.calls[1];
    expect(path).toBe('/api/v3/users/current/payments');
    // Dates must be YYYY-MM-DD local format, not ISO with T/Z
    expect(params.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.from).not.toContain('T');
    expect(params.to).not.toContain('T');
  });

  it('sets useQA from the parameter passed in', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce(MOCK_PAYMENTS);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', true);
    expect(config.useQA).toBe(true);
  });

  it('returns CrossoverConfig with setupComplete: false', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.setupComplete).toBe(false);
  });

  it('returned config has no undefined fields', async () => {
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    const fields: Array<keyof typeof config> = [
      'userId', 'fullName', 'managerId', 'primaryTeamId', 'assignmentId',
      'hourlyRate', 'weeklyLimit', 'useQA', 'isManager', 'teams',
      'lastRoleCheck', 'setupComplete', 'setupDate', 'debugMode',
    ];
    for (const field of fields) {
      expect(config[field]).not.toBeUndefined();
    }
  });
});

// --- Error Cases ---

describe('FR5: fetchAndBuildConfig — error cases', () => {
  it('throws AuthError when getAuthToken throws AuthError(401)', async () => {
    mockGetAuthToken.mockRejectedValueOnce(new AuthError(401));
    await expect(fetchAndBuildConfig('u', 'p', false)).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError when getAuthToken throws AuthError(403)', async () => {
    mockGetAuthToken.mockRejectedValueOnce(new AuthError(403));
    await expect(fetchAndBuildConfig('u', 'p', false)).rejects.toBeInstanceOf(AuthError);
  });

  it('throws NetworkError when getAuthToken throws NetworkError', async () => {
    mockGetAuthToken.mockRejectedValueOnce(new NetworkError('timeout'));
    await expect(fetchAndBuildConfig('u', 'p', false)).rejects.toBeInstanceOf(NetworkError);
  });

  it('sets hourlyRate to 0 when payments call fails (does not throw)', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail())
      .mockRejectedValueOnce(new Error('payments down'));
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.hourlyRate).toBe(0);
  });

  it('sets hourlyRate to 0 when payments returns empty array', async () => {
    mockApiGet
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce([]);
    const config = await fetchAndBuildConfig('user@test.com', 'pass', false);
    expect(config.hourlyRate).toBe(0);
  });
});
