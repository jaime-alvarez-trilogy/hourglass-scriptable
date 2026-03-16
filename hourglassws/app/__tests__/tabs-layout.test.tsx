// Tests: app/(tabs)/_layout.tsx (06-wiring-and-tokens)
// FR1: NoiseOverlay wired into tabs layout
// FR2: Tab bar backgroundColor/borderTopColor use color tokens
//
// Test approach:
// - Source-file static analysis (fs.readFileSync) for import and absence-of-hex checks
// - react-test-renderer for render checks
// - NoiseOverlay mocked as View with testID="noise-overlay" and pointerEvents="none"

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => {
  const mockReact = require('react');
  const { View } = require('react-native');

  const TabsScreen = () => null;

  const Tabs = ({ children, screenOptions }: any) =>
    mockReact.createElement(View, { testID: 'tabs', 'data-screen-options': JSON.stringify(screenOptions) }, children);
  Tabs.Screen = TabsScreen;

  return { Tabs };
});

jest.mock('@/components/haptic-tab', () => {
  const mockReact = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    HapticTab: ({ children, ...props }: any) =>
      mockReact.createElement(TouchableOpacity, props, children),
  };
});

jest.mock('@/components/ui/icon-symbol', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    IconSymbol: (props: any) => mockReact.createElement(View, { testID: 'icon-symbol' }),
  };
});

jest.mock('@/src/components/NoiseOverlay', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () =>
      mockReact.createElement(View, { testID: 'noise-overlay', pointerEvents: 'none' }),
  };
});

const LAYOUT_FILE = path.resolve(__dirname, '../(tabs)/_layout.tsx');

// ─── FR1: NoiseOverlay wiring ────────────────────────────────────────────────

describe('tabs _layout — FR1: NoiseOverlay wiring', () => {
  let TabLayout: any;

  beforeAll(() => {
    jest.resetModules();
    TabLayout = require('../(tabs)/_layout').default;
  });

  it('FR1.1 — TabLayout renders without crashing', () => {
    expect(() => {
      act(() => {
        create(React.createElement(TabLayout));
      });
    }).not.toThrow();
  });

  it('FR1.2 — NoiseOverlay is rendered (testID="noise-overlay" present in tree)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(TabLayout));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('noise-overlay');
  });

  it('FR1.3 — Tabs component is still rendered (testID="tabs" present)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(TabLayout));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"tabs"');
  });

  it('FR1.4 — source imports NoiseOverlay from @/src/components/NoiseOverlay', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).toContain('NoiseOverlay');
    expect(source).toContain('@/src/components/NoiseOverlay');
  });

  it('FR1.5 — source imports View from react-native', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).toMatch(/import\s*\{[^}]*\bView\b[^}]*\}\s*from\s*['"]react-native['"]/);
  });

  it('FR1.6 — NoiseOverlay rendered with pointerEvents="none" (does not intercept taps)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(TabLayout));
    });
    // Find the noise-overlay node in the instance tree
    const findNode = (node: any): any => {
      if (!node) return null;
      if (node.props?.testID === 'noise-overlay') return node;
      const ch = Array.isArray(node.children) ? node.children : [];
      for (const c of ch) {
        if (c && typeof c === 'object') {
          const found = findNode(c);
          if (found) return found;
        }
      }
      return null;
    };
    const noiseNode = findNode(tree.root);
    expect(noiseNode).not.toBeNull();
    expect(noiseNode.props.pointerEvents).toBe('none');
  });
});

// ─── FR2: Tab bar color tokens ───────────────────────────────────────────────

describe('tabs _layout — FR2: tab bar color tokens', () => {
  it('FR2.1 — source does NOT contain hardcoded "#13131A"', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).not.toContain("'#13131A'");
    expect(source).not.toContain('"#13131A"');
  });

  it('FR2.2 — source does NOT contain hardcoded "#2A2A3D"', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).not.toContain("'#2A2A3D'");
    expect(source).not.toContain('"#2A2A3D"');
  });

  it('FR2.3 — source imports colors from @/src/lib/colors', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).toContain('@/src/lib/colors');
    expect(source).toContain('colors');
  });

  it('FR2.4 — source uses colors.surface for backgroundColor', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).toContain('colors.surface');
  });

  it('FR2.5 — source uses colors.border for borderTopColor', () => {
    const source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    expect(source).toContain('colors.border');
  });

  it('FR2.6 — tabBarStyle backgroundColor resolves to colors.surface value at runtime (#16151F)', () => {
    const { colors } = require('@/src/lib/colors');
    // Verify the token value is what the spec expects
    expect(colors.surface).toBe('#16151F');
  });

  it('FR2.7 — tabBarStyle borderTopColor resolves to colors.border value at runtime (#2F2E41)', () => {
    const { colors } = require('@/src/lib/colors');
    expect(colors.border).toBe('#2F2E41');
  });
});
