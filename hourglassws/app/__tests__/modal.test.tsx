// Tests: modal.tsx BlurView integration (05-panel-glass-surfaces)
// FR3: BlurView modal — expo-blur BlurView with intensity=30, tint="dark"
//
// Mock strategy:
// - expo-blur: BlurView mocked as plain View forwarding all props
// - expo-router: useRouter mocked
// - @tanstack/react-query: useQueryClient mocked
// - @/src/store/config: loadCredentials, clearAll, loadConfig, saveConfig mocked
// - @/src/hooks/useConfig: useConfig mocked

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// Mock expo-blur — BlurView as a passthrough View
jest.mock('expo-blur', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, intensity, tint, style, ...props }: any) =>
      mockReact.createElement(View, { testID: 'blur-view', intensity, tint, style, ...props }, children),
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

// Mock config store
jest.mock('@/src/store/config', () => ({
  clearAll: jest.fn(),
  loadConfig: jest.fn().mockResolvedValue(null),
  loadCredentials: jest.fn().mockResolvedValue({ username: 'test@example.com' }),
  saveConfig: jest.fn(),
}));

// Mock useConfig hook
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

const MODAL_FILE = path.resolve(__dirname, '../modal.tsx');

// ─── FR3: BlurView render checks ──────────────────────────────────────────────

describe('modal — FR3: BlurView integration', () => {
  let ModalScreen: any;

  beforeAll(() => {
    jest.resetModules();
    // Re-register mocks after resetModules
    jest.mock('expo-blur', () => {
      const mockReact = require('react');
      const { View } = require('react-native');
      return {
        BlurView: ({ children, intensity, tint, style, ...props }: any) =>
          mockReact.createElement(View, { testID: 'blur-view', intensity, tint, style, ...props }, children),
      };
    });
    jest.mock('expo-router', () => ({
      useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
    }));
    jest.mock('@tanstack/react-query', () => ({
      useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
    }));
    jest.mock('@/src/store/config', () => ({
      clearAll: jest.fn(),
      loadConfig: jest.fn().mockResolvedValue(null),
      loadCredentials: jest.fn().mockResolvedValue({ username: 'test@example.com' }),
      saveConfig: jest.fn(),
    }));
    jest.mock('@/src/hooks/useConfig', () => ({
      useConfig: () => ({
        config: {
          fullName: 'Test User', userId: '123', managerId: '456',
          primaryTeamId: '789', assignmentId: '999', hourlyRate: 50,
          isManager: false, useQA: false,
          devManagerView: false, devOvertimePreview: false,
        },
      }),
    }));
    ModalScreen = require('../modal').default;
  });

  it('FR3.1 — modal renders without error', () => {
    expect(() => {
      act(() => {
        create(React.createElement(ModalScreen));
      });
    }).not.toThrow();
  });

  it('FR3.2 — modal renders a BlurView (testID="blur-view")', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(ModalScreen));
    });
    const instance = tree.root;
    // Find node with testID="blur-view"
    const findBlurView = (node: any): boolean => {
      if (node.props?.testID === 'blur-view') return true;
      if (node.children) {
        for (const child of node.children) {
          if (typeof child === 'object' && findBlurView(child)) return true;
        }
      }
      return false;
    };
    expect(findBlurView(instance)).toBe(true);
  });

  it('FR3.3 — BlurView has intensity={30}', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(ModalScreen));
    });
    const findBlurViewNode = (node: any): any => {
      if (node.props?.testID === 'blur-view') return node;
      if (node.children) {
        for (const child of node.children) {
          if (typeof child === 'object') {
            const found = findBlurViewNode(child);
            if (found) return found;
          }
        }
      }
      return null;
    };
    const blurNode = findBlurViewNode(tree.root);
    expect(blurNode).not.toBeNull();
    expect(blurNode.props.intensity).toBe(30);
  });

  it('FR3.4 — BlurView has tint="dark"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(ModalScreen));
    });
    const findBlurViewNode = (node: any): any => {
      if (node.props?.testID === 'blur-view') return node;
      if (node.children) {
        for (const child of node.children) {
          if (typeof child === 'object') {
            const found = findBlurViewNode(child);
            if (found) return found;
          }
        }
      }
      return null;
    };
    const blurNode = findBlurViewNode(tree.root);
    expect(blurNode).not.toBeNull();
    expect(blurNode.props.tint).toBe('dark');
  });

  it('FR3.5 — Settings title still renders (existing content preserved)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(ModalScreen));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Settings');
  });

  it('FR3.6 — Sign Out button still renders (existing content preserved)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(ModalScreen));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Sign Out');
  });
});

// ─── FR3: Source file checks ───────────────────────────────────────────────────

describe('modal — FR3: source file structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(MODAL_FILE, 'utf8');
  });

  it('FR3.7 — source imports BlurView from expo-blur', () => {
    expect(source).toContain('expo-blur');
    expect(source).toContain('BlurView');
  });

  it('FR3.8 — source uses intensity={30}', () => {
    expect(source).toContain('intensity={30}');
  });

  it('FR3.9 — source uses tint="dark"', () => {
    expect(source).toContain('tint="dark"');
  });

  it('FR3.10 — source uses surfaceElevated color for inner overlay', () => {
    expect(source).toContain('surfaceElevated');
  });
});
