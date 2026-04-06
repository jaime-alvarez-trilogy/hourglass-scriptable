// Tests: app/modal.tsx — 09-notifications-wiring
// FR4: unregisterPushToken called before clearAll in handleSignOut
//
// Test approach:
// - Render ModalScreen, trigger sign-out Alert action, verify call order
// - Static source analysis to confirm import and ordering
//
// Mock strategy:
// - @/src/lib/pushToken: unregisterPushToken spy (call order tracked)
// - @/src/store/config: clearAll spy (call order tracked)
// - Alert: mock .alert to immediately invoke destructive action handler
// - expo-router, @tanstack/react-query, expo-blur, useConfig all mocked

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { Alert } from 'react-native';

// ── Call order tracking ───────────────────────────────────────────────────────

const callOrder: string[] = [];

const mockUnregisterPushToken = jest.fn(async () => {
  callOrder.push('unregisterPushToken');
});
const mockClearAll = jest.fn(async () => {
  callOrder.push('clearAll');
});
const mockReplace = jest.fn();

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/src/lib/pushToken', () => ({
  unregisterPushToken: mockUnregisterPushToken,
}));

jest.mock('@/src/store/config', () => ({
  clearAll: mockClearAll,
  loadCredentials: jest.fn().mockResolvedValue({ username: 'test@test.com' }),
  saveConfig: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismiss: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
}));

jest.mock('expo-blur', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style }: any) =>
      mockReact.createElement(View, { style }, children),
  };
});

jest.mock('@/src/components/AnimatedPressable', () => {
  const mockReact = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    AnimatedPressable: ({ children, onPress, style }: any) =>
      mockReact.createElement(TouchableOpacity, { onPress, style }, children),
  };
});

jest.mock('@/src/hooks/useConfig', () => ({
  useConfig: () => ({
    config: {
      fullName: 'Test User',
      userId: '123',
      managerId: '456',
      primaryTeamId: '789',
      assignmentId: '999',
      hourlyRate: 50,
      isManager: false,
      useQA: false,
      devManagerView: false,
      devOvertimePreview: false,
    },
  }),
}));

jest.mock('@/src/api/auth', () => ({
  fetchAndBuildConfig: jest.fn(),
}));

jest.mock('@/src/lib/devMock', () => ({
  MOCK_TEAM_ITEMS: [],
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODAL_FILE = path.resolve(__dirname, '../modal.tsx');

/**
 * Trigger the destructive sign-out action by intercepting Alert.alert.
 * The mock immediately calls the "Sign Out" button's onPress handler.
 */
function triggerSignOut(alertSpy: jest.SpyInstance): () => Promise<void> {
  return async () => {
    const [[, , buttons]] = alertSpy.mock.calls as any[];
    const destructiveBtn = buttons.find((b: any) => b.style === 'destructive');
    await destructiveBtn.onPress();
  };
}

// ── Source analysis ───────────────────────────────────────────────────────────

describe('FR4: source file structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(MODAL_FILE, 'utf8');
  });

  it('FR4.0a — source imports unregisterPushToken from @/src/lib/pushToken', () => {
    expect(source).toContain('unregisterPushToken');
    expect(source).toContain('@/src/lib/pushToken');
  });

  it('FR4.0b — unregisterPushToken appears before clearAll in handleSignOut', () => {
    const unregIndex = source.indexOf('unregisterPushToken');
    const clearIndex = source.indexOf('clearAll');
    expect(unregIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(-1);
    expect(unregIndex).toBeLessThan(clearIndex);
  });
});

// ── Behaviour tests ───────────────────────────────────────────────────────────

describe('FR4: unregisterPushToken before clearAll in handleSignOut', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  function renderModal() {
    let renderer: any;
    act(() => {
      renderer = create(React.createElement(require('../modal').default));
    });
    return renderer;
  }

  it('FR4.1 — unregisterPushToken is called before clearAll', async () => {
    renderModal();

    // Find and press sign-out button
    const { findByType } = renderModal();
    let pressHandlers: Array<() => void> = [];

    act(() => {
      const root = renderModal();
      // Simulate pressing Sign Out
    });

    // Directly invoke handleSignOut via Alert mock interception
    await act(async () => {
      // Trigger alert by simulating button press
      const renderer = renderModal();
      // Get the Alert call from the last render's sign-out press
      const json = renderer.toJSON();
      // Find Sign Out button and press it
      function findPressable(node: any): any {
        if (!node) return null;
        if (Array.isArray(node)) return node.map(findPressable).find(Boolean);
        if (node.props?.onPress && JSON.stringify(node).includes('Sign Out')) return node;
        return findPressable(node.children);
      }
      // We trigger via Alert spy interception instead
    });

    // Direct test: call the alert and trigger the destructive action
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      const destructive = buttons.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    // Re-render and tap sign out button
    let renderer: any;
    act(() => {
      renderer = create(React.createElement(require('../modal').default));
    });

    // Find the sign out touchable and fire its onPress
    function findByText(node: any, text: string): any {
      if (!node) return null;
      if (typeof node === 'string' && node === text) return true;
      if (node.props) {
        if (findByText(node.props.children, text)) return node;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findByText(child, text);
          if (found && found !== true) return found;
        }
      }
      return null;
    }

    const tree = renderer.toJSON();
    const signOutNode = findByText(tree, 'Sign Out');

    await act(async () => {
      if (signOutNode?.props?.onPress) {
        await signOutNode.props.onPress();
      }
    });

    expect(callOrder).toEqual(expect.arrayContaining(['unregisterPushToken', 'clearAll']));
    const unregIdx = callOrder.indexOf('unregisterPushToken');
    const clearIdx = callOrder.indexOf('clearAll');
    expect(unregIdx).toBeLessThan(clearIdx);
  });

  it('FR4.2 — clearAll is still called even if unregisterPushToken throws', async () => {
    mockUnregisterPushToken.mockRejectedValueOnce(new Error('network error'));

    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      const destructive = buttons.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    let renderer: any;
    act(() => {
      renderer = create(React.createElement(require('../modal').default));
    });

    function findByText(node: any, text: string): any {
      if (!node) return null;
      if (typeof node === 'string' && node === text) return true;
      if (node.props) {
        if (findByText(node.props.children, text)) return node;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findByText(child, text);
          if (found && found !== true) return found;
        }
      }
      return null;
    }

    const tree = renderer.toJSON();
    const signOutNode = findByText(tree, 'Sign Out');

    await act(async () => {
      if (signOutNode?.props?.onPress) {
        await signOutNode.props.onPress();
      }
    });

    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it('FR4.3 — router.replace called after clearAll', async () => {
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      const destructive = buttons.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    let renderer: any;
    act(() => {
      renderer = create(React.createElement(require('../modal').default));
    });

    function findByText(node: any, text: string): any {
      if (!node) return null;
      if (typeof node === 'string' && node === text) return true;
      if (node.props) {
        if (findByText(node.props.children, text)) return node;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findByText(child, text);
          if (found && found !== true) return found;
        }
      }
      return null;
    }

    const tree = renderer.toJSON();
    const signOutNode = findByText(tree, 'Sign Out');

    await act(async () => {
      if (signOutNode?.props?.onPress) {
        await signOutNode.props.onPress();
      }
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/welcome');
  });
});
