// Tests: PanelGradient component (03-base-components)
// FR4: 5-state gradient hero panel with springPremium transition
//
// NOTE on NativeWind v4 + test-renderer:
// NativeWind v4 transforms className to hashed IDs in Jest/node.
// className assertions are done via source-file static analysis (fs.readFileSync).
//
// NOTE on expo-linear-gradient:
// Mocked below as a passthrough wrapper (renders children only).

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const PANEL_GRADIENT_FILE = path.resolve(__dirname, '../PanelGradient.tsx');

// ─── Runtime render checks ────────────────────────────────────────────────────

describe('PanelGradient — FR4: runtime render for all states', () => {
  let PanelGradient: any;

  beforeAll(() => {
    PanelGradient = require('../PanelGradient').default;
  });

  const allStates = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle'] as const;

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

// ─── PANEL_GRADIENTS export checks ───────────────────────────────────────────

describe('PanelGradient — FR4: PANEL_GRADIENTS export', () => {
  let PANEL_GRADIENTS: any;

  beforeAll(() => {
    PANEL_GRADIENTS = require('../PanelGradient').PANEL_GRADIENTS;
  });

  it('SC4.2 — PANEL_GRADIENTS is exported', () => {
    expect(PANEL_GRADIENTS).toBeDefined();
  });

  it('SC4.2 — PANEL_GRADIENTS has onTrack key', () => {
    expect(PANEL_GRADIENTS).toHaveProperty('onTrack');
  });

  it('SC4.2 — PANEL_GRADIENTS has behind key', () => {
    expect(PANEL_GRADIENTS).toHaveProperty('behind');
  });

  it('SC4.2 — PANEL_GRADIENTS has critical key', () => {
    expect(PANEL_GRADIENTS).toHaveProperty('critical');
  });

  it('SC4.2 — PANEL_GRADIENTS has crushedIt key', () => {
    expect(PANEL_GRADIENTS).toHaveProperty('crushedIt');
  });

  it('SC4.2 — PANEL_GRADIENTS has idle key', () => {
    expect(PANEL_GRADIENTS).toHaveProperty('idle');
  });

  it('SC4.2 — each PANEL_GRADIENTS entry has colors array', () => {
    const states = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle'];
    states.forEach((state) => {
      expect(Array.isArray(PANEL_GRADIENTS[state].colors)).toBe(true);
      expect(PANEL_GRADIENTS[state].colors.length).toBeGreaterThan(0);
    });
  });

  it('SC4.2 — each PANEL_GRADIENTS entry has start and end vectors', () => {
    const states = ['onTrack', 'behind', 'critical', 'crushedIt', 'idle'];
    states.forEach((state) => {
      expect(PANEL_GRADIENTS[state].start).toBeDefined();
      expect(PANEL_GRADIENTS[state].end).toBeDefined();
    });
  });

  it('SC4.3 — PANEL_GRADIENTS.idle uses flat surface colors (no transparent)', () => {
    const idleColors: string[] = PANEL_GRADIENTS.idle.colors;
    // idle state should not have transparent stops — it is a flat surface
    idleColors.forEach((c: string) => {
      expect(c.toLowerCase()).not.toBe('transparent');
    });
  });

  it('SC4.4 — PANEL_GRADIENTS.crushedIt colors contain gold-toned hex (E8C97A)', () => {
    const crushedItColors: string[] = PANEL_GRADIENTS.crushedIt.colors;
    const colorStr = crushedItColors.join('').toUpperCase();
    expect(colorStr).toContain('E8C97A');
  });

  it('SC4.5 — PANEL_GRADIENTS.critical colors contain rose-toned hex (F43F5E)', () => {
    const criticalColors: string[] = PANEL_GRADIENTS.critical.colors;
    const colorStr = criticalColors.join('').toUpperCase();
    expect(colorStr).toContain('F43F5E');
  });
});

// ─── Source file static checks ────────────────────────────────────────────────

describe('PanelGradient — FR4: source file imports and structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(PANEL_GRADIENT_FILE, 'utf8');
  });

  it('SC4.6 — source imports springPremium from reanimated-presets', () => {
    expect(source).toContain('springPremium');
  });

  it('SC4.7 — source imports from expo-linear-gradient', () => {
    expect(source).toContain('expo-linear-gradient');
  });

  it('SC4.8 — source does not use StyleSheet.create', () => {
    expect(source).not.toContain('StyleSheet.create');
  });

  it('SC4.9 — hex values only appear in PANEL_GRADIENTS constant (not scattered elsewhere)', () => {
    // Remove the PANEL_GRADIENTS block and check no hex remains in other code
    // Strategy: check that hex values in code appear only near PANEL_GRADIENTS
    const lines = source.split('\n');
    const hexLines = lines.filter(line => /#[0-9A-Fa-f]{6}/.test(line));
    hexLines.forEach(line => {
      // Each hex line should be inside the PANEL_GRADIENTS definition or a comment
      // Allow lines containing PANEL_GRADIENTS, colors:, or '//'
      const isInGradients = line.includes('colors') ||
        line.includes('PANEL_GRADIENTS') ||
        line.trim().startsWith('//') ||
        line.trim().startsWith('*');
      expect(isInGradients).toBe(true);
    });
  });

  it('SC4.6 — source uses withSpring for animation', () => {
    expect(source).toContain('withSpring');
  });
});
