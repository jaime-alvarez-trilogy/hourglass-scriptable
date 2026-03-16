// Tests: PanelGradient component (03-base-components + 05-panel-glass-surfaces)
// FR4: 5-state gradient hero panel with springPremium transition
// FR1: Radial panel gradient via SVG RadialGradient (cx=50%, cy=30%)
// FR2: Coloured glows — getGlowStyle export
//
// Mock strategy:
// - react-native-svg: passthrough Fragment components (no resetModules)
// - Platform.OS: Android branch verified via source analysis

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// Mock react-native-svg — passthrough components
jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const wrap = () => ({ children }: any) =>
    mockReact.createElement(mockReact.Fragment, null, children ?? null);
  return {
    __esModule: true,
    default: wrap(),
    Svg: wrap(),
    Defs: wrap(),
    RadialGradient: wrap(),
    Stop: () => null,
    Rect: () => null,
  };
});

const PANEL_GRADIENT_FILE = path.resolve(__dirname, '../PanelGradient.tsx');

// ─── Module handles — load once, no resetModules ──────────────────────────────

let PanelGradient: any;
let PANEL_GRADIENT_COLORS: any;
let PANEL_GRADIENTS: any;
let getGlowStyle: any;

beforeAll(() => {
  const mod = require('../PanelGradient');
  PanelGradient = mod.default;
  PANEL_GRADIENT_COLORS = mod.PANEL_GRADIENT_COLORS;
  PANEL_GRADIENTS = mod.PANEL_GRADIENTS;
  getGlowStyle = mod.getGlowStyle;
});

// ─── FR1: Runtime render ──────────────────────────────────────────────────────

describe('PanelGradient — FR1: runtime render for all states', () => {
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
        React.createElement(PanelGradient, { state: 'onTrack' }, 'child content')
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('child content');
  });

  it('FR1.3 — animation container present (tree not null)', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(PanelGradient, { state: 'onTrack' },
          React.createElement('View' as any, null)
        )
      );
    });
    expect(tree.toJSON()).not.toBeNull();
  });
});

// ─── FR1: PANEL_GRADIENT_COLORS export ───────────────────────────────────────

describe('PanelGradient — FR1: PANEL_GRADIENT_COLORS export', () => {
  it('FR1.12 — PANEL_GRADIENT_COLORS is exported', () => {
    expect(PANEL_GRADIENT_COLORS).toBeDefined();
  });

  it('FR1.13 — onTrack.inner contains #10B981', () => {
    expect(PANEL_GRADIENT_COLORS.onTrack?.inner?.toUpperCase()).toContain('10B981');
  });

  it('FR1.14 — behind.inner contains #F59E0B', () => {
    expect(PANEL_GRADIENT_COLORS.behind?.inner?.toUpperCase()).toContain('F59E0B');
  });

  it('FR1.15 — critical.inner contains #F43F5E', () => {
    expect(PANEL_GRADIENT_COLORS.critical?.inner?.toUpperCase()).toContain('F43F5E');
  });

  it('FR1.16 — crushedIt.inner contains #E8C97A', () => {
    expect(PANEL_GRADIENT_COLORS.crushedIt?.inner?.toUpperCase()).toContain('E8C97A');
  });

  it('FR1.17 — idle entry is null (no gradient)', () => {
    expect(PANEL_GRADIENT_COLORS.idle).toBeNull();
  });

  it('FR1.18 — overtime entry defined and not null', () => {
    expect(PANEL_GRADIENT_COLORS.overtime).toBeDefined();
    expect(PANEL_GRADIENT_COLORS.overtime).not.toBeNull();
  });
});

// ─── FR2: getGlowStyle ────────────────────────────────────────────────────────

describe('PanelGradient — FR2: getGlowStyle', () => {
  it('FR2.1 — getGlowStyle is a function', () => {
    expect(typeof getGlowStyle).toBe('function');
  });

  it('FR2.2 — getGlowStyle("onTrack") returns object with shadow or elevation', () => {
    const style = getGlowStyle('onTrack');
    const hasData = style.shadowColor !== undefined || style.elevation !== undefined;
    expect(hasData).toBe(true);
  });

  it('FR2.11 — getGlowStyle("idle") returns no shadow', () => {
    const style = getGlowStyle('idle');
    const noShadow =
      !style ||
      Object.keys(style).length === 0 ||
      style.shadowOpacity === 0 ||
      (style.elevation === 0 && !style.shadowColor);
    expect(noShadow).toBe(true);
  });

  it('FR2.12 — getGlowStyle returns something for all non-idle states', () => {
    ['onTrack', 'behind', 'critical', 'crushedIt', 'overtime'].forEach((state) => {
      const style = getGlowStyle(state as any);
      expect(style).toBeDefined();
    });
  });
});

// ─── FR1+FR2: Source file checks ─────────────────────────────────────────────

describe('PanelGradient — FR1+FR2: source file structure', () => {
  let source: string;
  let noComments: string;

  beforeAll(() => {
    source = fs.readFileSync(PANEL_GRADIENT_FILE, 'utf8');
    noComments = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('FR1.4 — imports from react-native-svg', () => {
    expect(source).toContain('react-native-svg');
  });

  it('FR1.5 — uses RadialGradient', () => {
    expect(source).toContain('RadialGradient');
  });

  it('FR1.6 — NO import from expo-linear-gradient (stripped comments)', () => {
    expect(noComments).not.toContain('expo-linear-gradient');
  });

  it('FR1.7 — uses cx="50%"', () => {
    expect(source).toContain('cx="50%"');
  });

  it('FR1.8 — uses cy="30%"', () => {
    expect(source).toContain('cy="30%"');
  });

  it('FR1.9 — uses r="70%"', () => {
    expect(source).toContain('r="70%"');
  });

  it('FR1.10 — imports springPremium', () => {
    expect(source).toContain('springPremium');
  });

  it('FR1.11 — uses withSpring', () => {
    expect(source).toContain('withSpring');
  });

  it('FR2.13 — checks Platform.OS for android branch', () => {
    expect(source).toContain('android');
    expect(source).toContain('Platform');
  });

  it('FR2.14 — uses elevation for Android fallback', () => {
    expect(source).toContain('elevation');
  });

  it('SC4.8 — no StyleSheet.create (outside comments)', () => {
    expect(noComments).not.toContain('StyleSheet.create');
  });
});

// ─── Legacy: PANEL_GRADIENTS backward compat ─────────────────────────────────

describe('PanelGradient — SC4: PANEL_GRADIENTS export (backward compat)', () => {
  it('SC4.2 — PANEL_GRADIENTS exported', () => {
    expect(PANEL_GRADIENTS).toBeDefined();
  });

  const states = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle', 'overtime'];
  states.forEach((state) => {
    it(`SC4.2 — PANEL_GRADIENTS.${state} has colors array`, () => {
      expect(Array.isArray(PANEL_GRADIENTS[state]?.colors)).toBe(true);
    });
  });

  it('FR3.3 — overtime colors contain FFF8E7', () => {
    const colorStr = PANEL_GRADIENTS.overtime.colors.join('').toUpperCase();
    expect(colorStr).toContain('FFF8E7');
  });

  it('SC4.4 — crushedIt colors contain E8C97A', () => {
    const colorStr = PANEL_GRADIENTS.crushedIt.colors.join('').toUpperCase();
    expect(colorStr).toContain('E8C97A');
  });

  it('SC4.5 — critical colors contain F43F5E', () => {
    const colorStr = PANEL_GRADIENTS.critical.colors.join('').toUpperCase();
    expect(colorStr).toContain('F43F5E');
  });
});
