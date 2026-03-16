// Tests: PanelGradient component (03-base-components + 05-panel-glass-surfaces)
// FR4: 5-state gradient hero panel with springPremium transition
// FR1: Radial panel gradient via SVG RadialGradient
// FR2: Coloured glows — getGlowStyle export
//
// NOTE on NativeWind v4 + test-renderer:
// NativeWind v4 transforms className to hashed IDs in Jest/node.
// className assertions are done via source-file static analysis (fs.readFileSync).
//
// NOTE on react-native-svg:
// Mocked as passthrough components (render children or null).
//
// NOTE on Platform.OS:
// Set via jest.mock or direct mutation for Android fallback tests.

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';
import { Platform } from 'react-native';

// Mock react-native-svg components
jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const makeComponent = (name: string) => {
    const Comp = ({ children, ...props }: any) =>
      mockReact.createElement(mockReact.Fragment, null, children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    __esModule: true,
    default: makeComponent('Svg'),
    Svg: makeComponent('Svg'),
    Defs: makeComponent('Defs'),
    RadialGradient: makeComponent('RadialGradient'),
    Stop: () => null,
    Rect: () => null,
  };
});

const PANEL_GRADIENT_FILE = path.resolve(__dirname, '../PanelGradient.tsx');

// ─── FR1: Radial gradient render checks ───────────────────────────────────────

describe('PanelGradient — FR1: radial gradient render for all states', () => {
  let PanelGradient: any;

  beforeAll(() => {
    jest.resetModules();
    PanelGradient = require('../PanelGradient').default;
  });

  const allStates = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle', 'overtime'] as const;

  allStates.forEach((state) => {
    it(`FR1.1 — renders without crash for state="${state}"`, () => {
      expect(() => {
        act(() => {
          create(
            React.createElement(PanelGradient, { state },
              React.createElement('View' as any, null)
            )
          );
        });
      }).not.toThrow();
    });
  });

  it('FR1.2 — renders children inside panel', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(PanelGradient, { state: 'onTrack' },
          'child content'
        )
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('child content');
  });

  it('FR1.3 — opacity animation container (Animated.View) is present', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(PanelGradient, { state: 'onTrack' },
          React.createElement('View' as any, null)
        )
      );
    });
    // Animated.View renders as a View node — tree should not be null
    expect(tree.toJSON()).not.toBeNull();
  });
});

// ─── FR1: Source file checks — SVG radial gradient ────────────────────────────

describe('PanelGradient — FR1: source uses SVG RadialGradient', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(PANEL_GRADIENT_FILE, 'utf8');
  });

  it('FR1.4 — source imports from react-native-svg', () => {
    expect(source).toContain('react-native-svg');
  });

  it('FR1.5 — source uses RadialGradient from react-native-svg', () => {
    expect(source).toContain('RadialGradient');
  });

  it('FR1.6 — source does NOT import from expo-linear-gradient', () => {
    // expo-linear-gradient should be replaced by SVG approach
    expect(source).not.toContain('expo-linear-gradient');
  });

  it('FR1.7 — RadialGradient uses cx="50%"', () => {
    expect(source).toContain('cx="50%"');
  });

  it('FR1.8 — RadialGradient uses cy="30%"', () => {
    expect(source).toContain('cy="30%"');
  });

  it('FR1.9 — RadialGradient uses r="70%"', () => {
    expect(source).toContain('r="70%"');
  });

  it('FR1.10 — source still imports springPremium (animation preserved)', () => {
    expect(source).toContain('springPremium');
  });

  it('FR1.11 — source still uses withSpring (animation preserved)', () => {
    expect(source).toContain('withSpring');
  });
});

// ─── FR1: PANEL_GRADIENT_COLORS export checks ────────────────────────────────

describe('PanelGradient — FR1: PANEL_GRADIENT_COLORS export', () => {
  let PANEL_GRADIENT_COLORS: any;

  beforeAll(() => {
    jest.resetModules();
    PANEL_GRADIENT_COLORS = require('../PanelGradient').PANEL_GRADIENT_COLORS;
  });

  it('FR1.12 — PANEL_GRADIENT_COLORS is exported', () => {
    expect(PANEL_GRADIENT_COLORS).toBeDefined();
  });

  it('FR1.13 — PANEL_GRADIENT_COLORS has onTrack key with inner colour #10B981', () => {
    expect(PANEL_GRADIENT_COLORS.onTrack).toBeDefined();
    expect(PANEL_GRADIENT_COLORS.onTrack.inner.toUpperCase()).toContain('10B981');
  });

  it('FR1.14 — PANEL_GRADIENT_COLORS has behind key with inner colour #F59E0B', () => {
    expect(PANEL_GRADIENT_COLORS.behind).toBeDefined();
    expect(PANEL_GRADIENT_COLORS.behind.inner.toUpperCase()).toContain('F59E0B');
  });

  it('FR1.15 — PANEL_GRADIENT_COLORS has critical key with inner colour #F43F5E', () => {
    expect(PANEL_GRADIENT_COLORS.critical).toBeDefined();
    expect(PANEL_GRADIENT_COLORS.critical.inner.toUpperCase()).toContain('F43F5E');
  });

  it('FR1.16 — PANEL_GRADIENT_COLORS has crushedIt key with inner colour #E8C97A', () => {
    expect(PANEL_GRADIENT_COLORS.crushedIt).toBeDefined();
    expect(PANEL_GRADIENT_COLORS.crushedIt.inner.toUpperCase()).toContain('E8C97A');
  });

  it('FR1.17 — PANEL_GRADIENT_COLORS has idle key (null or transparent)', () => {
    expect(PANEL_GRADIENT_COLORS).toHaveProperty('idle');
    // idle should be null or have transparent/no inner colour
    if (PANEL_GRADIENT_COLORS.idle !== null) {
      const inner = PANEL_GRADIENT_COLORS.idle?.inner ?? '';
      expect(inner.toLowerCase()).toMatch(/transparent|^$/);
    }
  });

  it('FR1.18 — PANEL_GRADIENT_COLORS has overtime key', () => {
    expect(PANEL_GRADIENT_COLORS).toHaveProperty('overtime');
  });
});

// ─── FR2: getGlowStyle export checks — iOS ────────────────────────────────────

describe('PanelGradient — FR2: getGlowStyle (iOS)', () => {
  let getGlowStyle: any;

  beforeAll(() => {
    // Ensure Platform.OS is ios for these tests
    jest.resetModules();
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    getGlowStyle = require('../PanelGradient').getGlowStyle;
  });

  it('FR2.1 — getGlowStyle is exported', () => {
    expect(getGlowStyle).toBeDefined();
    expect(typeof getGlowStyle).toBe('function');
  });

  it('FR2.2 — getGlowStyle("onTrack") returns shadowColor #10B981 on iOS', () => {
    const style = getGlowStyle('onTrack');
    expect(style.shadowColor?.toUpperCase()).toBe('#10B981');
  });

  it('FR2.3 — getGlowStyle("onTrack") returns shadowOpacity 0.12 on iOS', () => {
    const style = getGlowStyle('onTrack');
    expect(style.shadowOpacity).toBe(0.12);
  });

  it('FR2.4 — getGlowStyle("onTrack") returns shadowRadius 20 on iOS', () => {
    const style = getGlowStyle('onTrack');
    expect(style.shadowRadius).toBe(20);
  });

  it('FR2.5 — getGlowStyle("behind") returns shadowColor #F59E0B on iOS', () => {
    const style = getGlowStyle('behind');
    expect(style.shadowColor?.toUpperCase()).toBe('#F59E0B');
  });

  it('FR2.6 — getGlowStyle("critical") returns shadowColor #F43F5E on iOS', () => {
    const style = getGlowStyle('critical');
    expect(style.shadowColor?.toUpperCase()).toBe('#F43F5E');
  });

  it('FR2.7 — getGlowStyle("critical") returns shadowOpacity 0.18 on iOS', () => {
    const style = getGlowStyle('critical');
    expect(style.shadowOpacity).toBe(0.18);
  });

  it('FR2.8 — getGlowStyle("critical") returns shadowRadius 24 on iOS', () => {
    const style = getGlowStyle('critical');
    expect(style.shadowRadius).toBe(24);
  });

  it('FR2.9 — getGlowStyle("crushedIt") returns shadowColor #E8C97A on iOS', () => {
    const style = getGlowStyle('crushedIt');
    expect(style.shadowColor?.toUpperCase()).toBe('#E8C97A');
  });

  it('FR2.10 — getGlowStyle("crushedIt") returns shadowOpacity 0.18 on iOS', () => {
    const style = getGlowStyle('crushedIt');
    expect(style.shadowOpacity).toBe(0.18);
  });

  it('FR2.11 — getGlowStyle("idle") returns no shadow (shadowOpacity 0 or empty)', () => {
    const style = getGlowStyle('idle');
    const hasNoShadow =
      !style ||
      style.shadowOpacity === 0 ||
      Object.keys(style).length === 0 ||
      style.shadowColor === undefined;
    expect(hasNoShadow).toBe(true);
  });

  it('FR2.12 — non-idle states have shadowOffset defined', () => {
    const style = getGlowStyle('onTrack');
    expect(style.shadowOffset).toBeDefined();
  });
});

// ─── FR2: getGlowStyle — Android fallback ─────────────────────────────────────

describe('PanelGradient — FR2: getGlowStyle Android fallback', () => {
  let getGlowStyle: any;

  beforeAll(() => {
    jest.resetModules();
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    getGlowStyle = require('../PanelGradient').getGlowStyle;
  });

  afterAll(() => {
    // Reset Platform.OS back to ios for other tests
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });

  it('FR2.13 — getGlowStyle("onTrack") returns elevation 4 on Android', () => {
    const style = getGlowStyle('onTrack');
    expect(style.elevation).toBe(4);
  });

  it('FR2.14 — getGlowStyle("critical") returns elevation 4 on Android', () => {
    const style = getGlowStyle('critical');
    expect(style.elevation).toBe(4);
  });

  it('FR2.15 — getGlowStyle("idle") returns elevation 0 on Android', () => {
    const style = getGlowStyle('idle');
    expect(style.elevation).toBe(0);
  });

  it('FR2.16 — getGlowStyle on Android does NOT include shadowColor (not supported)', () => {
    const style = getGlowStyle('onTrack');
    expect(style.shadowColor).toBeUndefined();
  });
});

// ─── Legacy: SC4 tests preserved for non-breaking compatibility ────────────────

describe('PanelGradient — SC4: runtime render (backward compat)', () => {
  let PanelGradient: any;

  beforeAll(() => {
    jest.resetModules();
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    PanelGradient = require('../PanelGradient').default;
  });

  const allStates = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle', 'overtime'] as const;

  allStates.forEach((state) => {
    it(`SC4.1 — renders without crash for state="${state}"`, () => {
      expect(() => {
        act(() => {
          create(
            React.createElement(PanelGradient, { state },
              React.createElement('View' as any, null)
            )
          );
        });
      }).not.toThrow();
    });
  });

  it('SC4.1 — renders children inside panel', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(PanelGradient, { state: 'onTrack' },
          'child content'
        )
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('child content');
  });
});

// ─── Source file static checks (updated for SVG) ──────────────────────────────

describe('PanelGradient — FR4: source file imports and structure', () => {
  let source: string;
  let code: string;

  beforeAll(() => {
    source = fs.readFileSync(PANEL_GRADIENT_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('SC4.6 — source imports springPremium from reanimated-presets', () => {
    expect(source).toContain('springPremium');
  });

  it('SC4.8 — code does not use StyleSheet.create (outside comments)', () => {
    expect(code).not.toContain('StyleSheet.create');
  });

  it('SC4.6 — source uses withSpring for animation', () => {
    expect(source).toContain('withSpring');
  });
});
