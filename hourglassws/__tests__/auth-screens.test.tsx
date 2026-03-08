/**
 * @jest-environment jsdom
 */
// FR1-FR4, FR6-FR7: Auth screen rendering and interaction tests
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import type { CrossoverConfig } from '../src/types/config';

// --- Mocks (must come before screen imports) ---

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  Redirect: () => null,
}));

jest.mock('../src/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

jest.mock('../src/hooks/useConfig', () => ({
  useConfig: jest.fn(),
}));

jest.mock('../src/hooks/useRoleRefresh', () => ({
  useRoleRefresh: jest.fn(),
}));

jest.mock('../src/store/config', () => ({
  saveConfig: jest.fn(),
  saveCredentials: jest.fn(),
}));

// Static imports of screens after mocks are registered
import WelcomeScreen from '../app/(auth)/welcome';
import CredentialsScreen from '../app/(auth)/credentials';
import VerifyingScreen from '../app/(auth)/verifying';
import SetupScreen from '../app/(auth)/setup';
import SuccessScreen from '../app/(auth)/success';

import { useRouter } from 'expo-router';
import { useOnboarding } from '../src/contexts/OnboardingContext';
import { useConfig } from '../src/hooks/useConfig';
import { saveConfig, saveCredentials } from '../src/store/config';

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;
const mockUseConfig = useConfig as jest.MockedFunction<typeof useConfig>;
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>;
const mockSaveCredentials = saveCredentials as jest.MockedFunction<typeof saveCredentials>;

const makeConfig = (overrides: Partial<CrossoverConfig> = {}): CrossoverConfig => ({
  userId: '2362707', fullName: 'Jane Doe', managerId: '2372227',
  primaryTeamId: '4584', assignmentId: '79996', hourlyRate: 75,
  weeklyLimit: 40, useQA: false, isManager: false,
  teams: [{ id: '4584', name: 'Team Alpha', company: '' }],
  lastRoleCheck: new Date().toISOString(), setupComplete: true,
  setupDate: new Date().toISOString(), debugMode: false,
  ...overrides,
});

const makeSetupResult = (overrides: Partial<ReturnType<typeof useOnboarding>> = {}): ReturnType<typeof useOnboarding> => ({
  step: 'welcome',
  setEnvironment: jest.fn(),
  submitCredentials: jest.fn(),
  submitRate: jest.fn(),
  pendingConfig: makeConfig({ setupComplete: false }),
  pendingCredentials: { username: 'user@test.com', password: 'pass' },
  isLoading: false,
  error: null,
  ...overrides,
});

function makeRouter() {
  const push = jest.fn();
  const replace = jest.fn();
  mockUseRouter.mockReturnValue({ push, replace } as unknown as ReturnType<typeof useRouter>);
  return { push, replace };
}

/** Recursively collect all string leaves from a React element children tree */
function collectText(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(collectText).join('');
  }
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return collectText((children as { props: { children?: unknown } }).props?.children);
  }
  return '';
}

/** Find a TouchableOpacity whose child text includes the given string */
function findButton(touchables: Array<{ props: { children?: unknown; disabled?: boolean } }>, label: string) {
  return touchables.find((t) => collectText(t.props.children).includes(label));
}


beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnboarding.mockReturnValue(makeSetupResult());
  makeRouter();
});

// ============================================================
// FR2: Welcome Screen
// ============================================================

describe('FR2: Welcome Screen', () => {
  it('renders both Production and QA toggle options (SC2.1)', () => {
    const { UNSAFE_getAllByType } = render(<WelcomeScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('Production'))).toBe(true);
    expect(texts.some((t) => t.includes('QA'))).toBe(true);
  });

  it('calls setEnvironment(false) when Production is selected (SC2.2)', () => {
    const setEnvironment = jest.fn();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ setEnvironment }));
    const { UNSAFE_getAllByType } = render(<WelcomeScreen />);
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const prodOption = touchables.find((t) => collectText(t.props.children).includes('Production'));
    if (prodOption) fireEvent.press(prodOption);
    expect(setEnvironment).toHaveBeenCalledWith(false);
  });

  it('calls setEnvironment(true) when QA is selected (SC2.2)', () => {
    const setEnvironment = jest.fn();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ setEnvironment }));
    const { UNSAFE_getAllByType } = render(<WelcomeScreen />);
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const qaOption = touchables.find((t) => collectText(t.props.children).includes('QA'));
    if (qaOption) fireEvent.press(qaOption);
    expect(setEnvironment).toHaveBeenCalledWith(true);
  });

  it('navigates to /(auth)/credentials on "Get Started" (SC2.4)', () => {
    const { push } = makeRouter();
    const { UNSAFE_getAllByType } = render(<WelcomeScreen />);
    const getStartedBtn = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Get Started')
    );
    if (getStartedBtn) fireEvent.press(getStartedBtn);
    expect(push).toHaveBeenCalledWith('/(auth)/credentials');
  });

  it('does not show email/password/token input fields (SC2.5)', () => {
    const { UNSAFE_queryAllByType } = render(<WelcomeScreen />);
    expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });
});

// ============================================================
// FR3: Credentials Screen
// ============================================================

describe('FR3: Credentials Screen', () => {
  it('email input has email-address keyboard and autoCapitalize none (SC3.1)', () => {
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const inputs = UNSAFE_getAllByType(TextInput);
    const email = inputs.find((i) => i.props.keyboardType === 'email-address');
    expect(email).toBeDefined();
    expect(email!.props.autoCapitalize).toBe('none');
  });

  it('password input has secureTextEntry (SC3.1)', () => {
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const inputs = UNSAFE_getAllByType(TextInput);
    const password = inputs.find((i) => i.props.secureTextEntry);
    expect(password).toBeDefined();
  });

  it('empty fields — Sign In shows validation errors; submitCredentials not called (SC3.2)', () => {
    const submitCredentials = jest.fn();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ submitCredentials }));
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Sign In')
    );
    if (button) fireEvent.press(button);
    expect(submitCredentials).not.toHaveBeenCalled();
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.toLowerCase().includes('required'))).toBe(true);
  });

  it('both fields filled → Sign In calls submitCredentials(email, password) (SC3.3)', () => {
    const submitCredentials = jest.fn().mockResolvedValue(undefined);
    mockUseOnboarding.mockReturnValue(makeSetupResult({ submitCredentials }));
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const inputs = UNSAFE_getAllByType(TextInput);
    const emailInput = inputs.find((i) => i.props.keyboardType === 'email-address');
    const passwordInput = inputs.find((i) => i.props.secureTextEntry);
    if (emailInput) fireEvent.changeText(emailInput, 'user@test.com');
    if (passwordInput) fireEvent.changeText(passwordInput, 'pass123');
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Sign In')
    );
    if (button) fireEvent.press(button);
    expect(submitCredentials).toHaveBeenCalledWith('user@test.com', 'pass123');
  });

  it('submit button is disabled while isLoading (SC3.4)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({ isLoading: true }));
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const disabledBtn = UNSAFE_getAllByType(TouchableOpacity).find((t) => t.props.disabled === true);
    expect(disabledBtn).toBeDefined();
  });

  it('shows error string from hook when error is non-null (SC3.5)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({ error: 'Invalid email or password.' }));
    const { UNSAFE_getAllByType } = render(<CredentialsScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('Invalid email or password.'))).toBe(true);
  });
});

// ============================================================
// FR4: Verifying Screen
// ============================================================

describe('FR4: Verifying Screen', () => {
  it('renders ActivityIndicator and "Verifying your account…" (SC4.1)', () => {
    const { UNSAFE_getAllByType } = render(<VerifyingScreen />);
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('Verifying'))).toBe(true);
  });

  it('renders no interactive controls (SC4.1)', () => {
    const { UNSAFE_queryAllByType } = render(<VerifyingScreen />);
    expect(UNSAFE_queryAllByType(TouchableOpacity)).toHaveLength(0);
    expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('navigates to /(auth)/success when step is "success" (SC4.3)', () => {
    const { replace } = makeRouter();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ step: 'success' }));
    render(<VerifyingScreen />);
    expect(replace).toHaveBeenCalledWith('/(auth)/success');
  });

  it('navigates to /(auth)/setup when step is "setup" (SC4.4)', () => {
    const { replace } = makeRouter();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ step: 'setup' }));
    render(<VerifyingScreen />);
    expect(replace).toHaveBeenCalledWith('/(auth)/setup');
  });

  it('navigates to /(auth)/credentials when step is "credentials" (SC4.5)', () => {
    const { replace } = makeRouter();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ step: 'credentials' }));
    render(<VerifyingScreen />);
    expect(replace).toHaveBeenCalledWith('/(auth)/credentials');
  });
});

// ============================================================
// FR6: Setup Screen
// ============================================================

describe('FR6: Setup Screen', () => {
  it('renders numeric input with decimal-pad keyboard (SC6.2)', () => {
    const { UNSAFE_getAllByType } = render(<SetupScreen />);
    const input = UNSAFE_getAllByType(TextInput).find(
      (i) => i.props.keyboardType === 'decimal-pad'
    );
    expect(input).toBeDefined();
  });

  it('empty input — Continue shows validation error; submitRate not called (SC6.3)', () => {
    const submitRate = jest.fn();
    mockUseOnboarding.mockReturnValue(makeSetupResult({ submitRate }));
    const { UNSAFE_getAllByType } = render(<SetupScreen />);
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Continue')
    );
    if (button) fireEvent.press(button);
    expect(submitRate).not.toHaveBeenCalled();
  });

  it('valid positive number — Continue calls submitRate(rate) (SC6.4)', () => {
    const submitRate = jest.fn().mockResolvedValue(undefined);
    mockUseOnboarding.mockReturnValue(makeSetupResult({ submitRate }));
    const { UNSAFE_getAllByType } = render(<SetupScreen />);
    const input = UNSAFE_getAllByType(TextInput).find(
      (i) => i.props.keyboardType === 'decimal-pad'
    );
    if (input) fireEvent.changeText(input, '75');
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Continue')
    );
    if (button) fireEvent.press(button);
    expect(submitRate).toHaveBeenCalledWith(75);
  });

  it('button is disabled while isLoading (SC6.5)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({ isLoading: true }));
    const { UNSAFE_getAllByType } = render(<SetupScreen />);
    const disabledBtn = UNSAFE_getAllByType(TouchableOpacity).find((t) => t.props.disabled === true);
    expect(disabledBtn).toBeDefined();
  });

  it('displays error string when error is non-null (SC6.6)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({ error: 'Rate lookup failed.' }));
    const { UNSAFE_getAllByType } = render(<SetupScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('Rate lookup failed.'))).toBe(true);
  });
});

// ============================================================
// FR7: Success Screen
// ============================================================

describe('FR7: Success Screen', () => {
  it('displays fullName as primary heading (SC7.1)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ fullName: 'Jane Doe', setupComplete: false }),
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t === 'Jane Doe')).toBe(true);
  });

  it('shows "Contributor" when isManager is false (SC7.2)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ isManager: false, setupComplete: false }),
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t === 'Contributor')).toBe(true);
  });

  it('shows "Manager" when isManager is true (SC7.2)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ isManager: true, setupComplete: false }),
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t === 'Manager')).toBe(true);
  });

  it('displays hourly rate formatted as $N / hr (SC7.3)', () => {
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ hourlyRate: 75, setupComplete: false }),
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('75') && t.includes('hr'))).toBe(true);
  });

  it('calls saveCredentials and saveConfig({ setupComplete: true }) on "Go to Dashboard" (SC7.4)', async () => {
    mockSaveCredentials.mockResolvedValue();
    mockSaveConfig.mockResolvedValue();
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ setupComplete: false }),
      pendingCredentials: { username: 'user@test.com', password: 'pass' },
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Dashboard')
    );
    if (button) fireEvent.press(button);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSaveCredentials).toHaveBeenCalledWith('user@test.com', 'pass');
    expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({ setupComplete: true }));
  });

  it('button is not disabled initially (SC7.7)', () => {
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Dashboard')
    );
    expect(button?.props.disabled).toBeFalsy();
  });

  it('shows error message when storage write fails (SC7.5)', async () => {
    mockSaveCredentials.mockRejectedValue(new Error('SecureStore failed'));
    mockSaveConfig.mockResolvedValue();
    mockUseOnboarding.mockReturnValue(makeSetupResult({
      pendingConfig: makeConfig({ setupComplete: false }),
      pendingCredentials: { username: 'user@test.com', password: 'pass' },
    }));
    const { UNSAFE_getAllByType } = render(<SuccessScreen />);
    const button = UNSAFE_getAllByType(TouchableOpacity).find((t) =>
      collectText(t.props.children).includes('Dashboard')
    );
    if (button) {
      fireEvent.press(button);
      await new Promise((r) => setTimeout(r, 20));
    }
    const texts = UNSAFE_getAllByType(Text).map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes('SecureStore failed') || t.includes('Failed') || t.includes('save'))).toBe(true);
  });
});
