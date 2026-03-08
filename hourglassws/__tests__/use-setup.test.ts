// FR8: useSetup hook (src/hooks/useAuth.ts)
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useSetup } from '../src/hooks/useAuth';
import { AuthError, NetworkError } from '../src/api/errors';
import type { CrossoverConfig } from '../src/types/config';
import * as SecureStoreMock from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetchAndBuildConfig from auth.ts
jest.mock('../src/api/auth', () => ({
  fetchAndBuildConfig: jest.fn(),
  getProfileDetail: jest.fn(),
}));

const { fetchAndBuildConfig } = require('../src/api/auth');
const mockFetch = fetchAndBuildConfig as jest.MockedFunction<typeof fetchAndBuildConfig>;

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
  lastRoleCheck: new Date().toISOString(),
  setupComplete: false,
  setupDate: new Date().toISOString(),
  debugMode: false,
  ...overrides,
});

// Hook test harness: creates a fresh component tree and captures the hook result
function mountHook(): { get: () => ReturnType<typeof useSetup> } {
  let current!: ReturnType<typeof useSetup>;
  act(() => {
    create(React.createElement(() => { current = useSetup(); return null; }));
  });
  return { get: () => current };
}

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStoreMock as unknown as { _reset: () => void })._reset();
  (AsyncStorage as unknown as { _reset: () => void })._reset();
});

// --- Initial State ---

describe('FR8: useSetup — initial state', () => {
  it('starts with step = welcome, isLoading = false, error = null', () => {
    const { get } = mountHook();
    expect(get().step).toBe('welcome');
    expect(get().isLoading).toBe(false);
    expect(get().error).toBeNull();
  });

  it('exposes the full hook API', () => {
    const { get } = mountHook();
    const hook = get();
    expect(typeof hook.setEnvironment).toBe('function');
    expect(typeof hook.submitCredentials).toBe('function');
    expect(typeof hook.submitRate).toBe('function');
    expect(typeof hook.isLoading).toBe('boolean');
    expect(hook.error === null || typeof hook.error === 'string').toBe(true);
  });
});

// --- setEnvironment ---

describe('FR8: useSetup — setEnvironment', () => {
  it('does not change step when called', () => {
    const { get } = mountHook();
    act(() => { get().setEnvironment(true); });
    expect(get().step).toBe('welcome');
  });

  it('stores the QA environment flag for use in credential submission', async () => {
    mockFetch.mockResolvedValueOnce(makeConfig());
    const { get } = mountHook();
    act(() => { get().setEnvironment(true); }); // set QA = true
    await act(async () => { await get().submitCredentials('u', 'p'); });
    // fetchAndBuildConfig should have been called with useQA = true
    expect(mockFetch).toHaveBeenCalledWith('u', 'p', true);
  });
});

// --- submitCredentials step transitions ---

describe('FR8: useSetup — submitCredentials transitions', () => {
  it('transitions step to verifying synchronously before async work completes', async () => {
    let resolveConfig!: (v: CrossoverConfig) => void;
    mockFetch.mockImplementationOnce(
      () => new Promise<CrossoverConfig>((res) => { resolveConfig = res; }),
    );
    const { get } = mountHook();

    // Start the submission — step should be 'verifying' after the sync part
    act(() => { void get().submitCredentials('u', 'p'); });
    expect(get().step).toBe('verifying');

    // Resolve so test cleans up
    await act(async () => { resolveConfig(makeConfig({ hourlyRate: 50 })); });
  });

  it('sets isLoading = true while fetchAndBuildConfig is in flight', async () => {
    let resolveConfig!: (v: CrossoverConfig) => void;
    mockFetch.mockImplementationOnce(
      () => new Promise<CrossoverConfig>((res) => { resolveConfig = res; }),
    );
    const { get } = mountHook();
    act(() => { void get().submitCredentials('u', 'p'); });
    expect(get().isLoading).toBe(true);
    await act(async () => { resolveConfig(makeConfig()); });
  });

  it('transitions to success when hourlyRate > 0', async () => {
    mockFetch.mockResolvedValueOnce(makeConfig({ hourlyRate: 50 }));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'p'); });
    expect(get().step).toBe('success');
    expect(get().isLoading).toBe(false);
  });

  it('transitions to setup when hourlyRate === 0', async () => {
    mockFetch.mockResolvedValueOnce(makeConfig({ hourlyRate: 0 }));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'p'); });
    expect(get().step).toBe('setup');
  });

  it('reverts to credentials and sets "Invalid email or password." on AuthError 401', async () => {
    mockFetch.mockRejectedValueOnce(new AuthError(401));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'bad'); });
    expect(get().step).toBe('credentials');
    expect(get().error).toBe('Invalid email or password.');
    expect(get().isLoading).toBe(false);
  });

  it('reverts to credentials and sets "Invalid email or password." on AuthError 403', async () => {
    mockFetch.mockRejectedValueOnce(new AuthError(403));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'bad'); });
    expect(get().step).toBe('credentials');
    expect(get().error).toBe('Invalid email or password.');
  });

  it('reverts to credentials and sets connection error message on NetworkError', async () => {
    mockFetch.mockRejectedValueOnce(new NetworkError('connection refused'));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'p'); });
    expect(get().step).toBe('credentials');
    expect(typeof get().error).toBe('string');
    expect(get().error).toBeTruthy();
    // Must not expose stack trace or raw error object
    expect(get().error).not.toContain('Error:');
    expect(get().error).not.toContain('at ');
  });
});

// --- no-op + error reset ---

describe('FR8: useSetup — in-flight guard and error reset', () => {
  it('is a no-op if submitCredentials called while isLoading = true', async () => {
    let resolveFirst!: (v: CrossoverConfig) => void;
    mockFetch
      .mockImplementationOnce(
        () => new Promise<CrossoverConfig>((res) => { resolveFirst = res; }),
      )
      .mockResolvedValue(makeConfig()); // should NOT be called

    const { get } = mountHook();
    act(() => { void get().submitCredentials('u', 'p'); });
    expect(get().isLoading).toBe(true);
    // Second call while loading — ignored
    act(() => { void get().submitCredentials('u2', 'p2'); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await act(async () => { resolveFirst(makeConfig()); });
  });

  it('resets error to null at the start of a new submission', async () => {
    mockFetch.mockRejectedValueOnce(new AuthError(401));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'bad'); });
    expect(get().error).toBe('Invalid email or password.');

    // Second attempt — start another pending submission and verify error clears
    let resolveSecond!: (v: CrossoverConfig) => void;
    mockFetch.mockImplementationOnce(
      () => new Promise<CrossoverConfig>((res) => { resolveSecond = res; }),
    );
    act(() => { void get().submitCredentials('u', 'corrected'); });
    expect(get().error).toBeNull(); // error cleared at submission start
    await act(async () => { resolveSecond(makeConfig()); });
  });
});

// --- submitRate ---

describe('FR8: useSetup — submitRate', () => {
  it('merges rate into pending config and transitions step to success', async () => {
    mockFetch.mockResolvedValueOnce(makeConfig({ hourlyRate: 0 }));
    const { get } = mountHook();
    await act(async () => { await get().submitCredentials('u', 'p'); });
    expect(get().step).toBe('setup');

    await act(async () => { await get().submitRate(75); });
    expect(get().step).toBe('success');
    expect(get().isLoading).toBe(false);
  });
});
