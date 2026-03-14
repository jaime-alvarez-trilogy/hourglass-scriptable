// Tests: Card component (03-base-components)
// FR1: NativeWind surface container with elevated variant
//
// NOTE on NativeWind v4 + test-renderer:
// NativeWind v4 transforms className to hashed IDs in Jest/node.
// className assertions are done via source-file static analysis (fs.readFileSync).

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

const CARD_FILE = path.resolve(__dirname, '../Card.tsx');

// ─── Runtime render checks ────────────────────────────────────────────────────

describe('Card — FR1: runtime render', () => {
  let Card: any;

  beforeAll(() => {
    Card = require('../Card').default;
  });

  it('SC1.1 — renders children without crash', () => {
    expect(() => {
      act(() => {
        create(React.createElement(Card, null, React.createElement('View' as any, null)));
      });
    }).not.toThrow();
  });

  it('SC1.1 — children are present in rendered output', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(Card, null, 'card content'));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('card content');
  });

  it('SC1.1 — renders with elevated=true without crash', () => {
    expect(() => {
      act(() => {
        create(React.createElement(Card, { elevated: true }, 'elevated card'));
      });
    }).not.toThrow();
  });

  it('SC1.1 — renders with className prop without crash', () => {
    expect(() => {
      act(() => {
        create(React.createElement(Card, { className: 'p-8' }, 'custom padding'));
      });
    }).not.toThrow();
  });

  it('SC1.1 — renders exactly one root element (not fragment, not array)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(Card, null, 'child'));
    });
    const json = tree.toJSON();
    // Should be a single element, not an array
    expect(Array.isArray(json)).toBe(false);
    expect(json).not.toBeNull();
  });
});

// ─── Source file static checks ────────────────────────────────────────────────

describe('Card — FR1: source file class strings', () => {
  let source: string;
  let code: string;

  beforeAll(() => {
    source = fs.readFileSync(CARD_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('SC1.2 — source contains bg-surface class string', () => {
    expect(source).toContain('bg-surface');
  });

  it('SC1.2 — source contains rounded-2xl class string', () => {
    expect(source).toContain('rounded-2xl');
  });

  it('SC1.2 — source contains border-border class string', () => {
    expect(source).toContain('border-border');
  });

  it('SC1.3 — source contains bg-surfaceElevated class string (for elevated variant)', () => {
    expect(source).toContain('bg-surfaceElevated');
  });

  it('SC1.3 — bg-surfaceElevated and bg-surface are in a conditional (elevated toggle)', () => {
    // Both variants must be present and should appear in a conditional context
    expect(source).toContain('bg-surfaceElevated');
    expect(source).toContain('bg-surface');
    // Verify there's conditional logic (ternary or if)
    expect(source).toMatch(/elevated[\s\S]{0,30}bg-surface/);
  });

  it('SC1.4 — source accepts className prop (className appears in props/destructuring)', () => {
    expect(source).toMatch(/className/);
  });

  it('SC1.5 — code does not use StyleSheet.create (outside comments)', () => {
    expect(code).not.toContain('StyleSheet.create');
  });

  it('SC1.6 — code does not contain hardcoded hex color values (outside comments)', () => {
    expect(code).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('SC1.6 — code does not import StyleSheet (outside comments)', () => {
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });
});
