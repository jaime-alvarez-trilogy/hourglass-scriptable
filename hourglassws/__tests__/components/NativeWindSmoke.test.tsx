// Tests: NativeWindSmoke component (01-nativewind-verify)
// FR1: Component exists, uses className only, renders correct tokens and text
// FR2: Component is mounted in index.tsx
// FR3: Verification comment is present in source file

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── FR1: NativeWindSmoke component ──────────────────────────────────────────

describe('NativeWindSmoke — FR1: component structure', () => {
  let NativeWindSmoke: any;

  beforeAll(() => {
    // Will throw (and fail these tests) if the file doesn't exist
    NativeWindSmoke = require('../../src/components/NativeWindSmoke').default;
  });

  it('FR1 SC1.1 — file can be imported (exists at src/components/NativeWindSmoke.tsx)', () => {
    expect(NativeWindSmoke).toBeDefined();
    expect(typeof NativeWindSmoke).toBe('function');
  });

  it('FR1 SC1.8 — component renders without crashing', () => {
    expect(() => {
      act(() => {
        create(React.createElement(NativeWindSmoke));
      });
    }).not.toThrow();
  });

  it('FR1 SC1.5 + SC1.6 — renders text "42.5" and "Hours This Week"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('42.5');
    expect(text).toContain('Hours This Week');
  });

  it('FR1 SC1.3 — outer container has className bg-background', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    // NativeWind v4: className prop is passed through and accessible on the root node
    expect(json.props.className).toBeDefined();
    expect(json.props.className).toContain('bg-background');
  });

  it('FR1 SC1.3 — outer container className includes flex-1 items-center justify-center', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    expect(json.props.className).toContain('flex-1');
    expect(json.props.className).toContain('items-center');
    expect(json.props.className).toContain('justify-center');
  });

  it('FR1 SC1.4 — inner card has className bg-surface rounded-2xl p-5 border border-border', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    // Inner card is the first child of the outer container
    const card = json.children?.[0];
    expect(card).toBeDefined();
    expect(card.props.className).toContain('bg-surface');
    expect(card.props.className).toContain('rounded-2xl');
    expect(card.props.className).toContain('p-5');
    expect(card.props.className).toContain('border');
    expect(card.props.className).toContain('border-border');
  });

  it('FR1 SC1.5 — hero text "42.5" has className text-gold font-display text-3xl', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    const card = json.children?.[0];
    const heroText = card?.children?.[0];
    expect(heroText).toBeDefined();
    expect(heroText.children).toContain('42.5');
    expect(heroText.props.className).toContain('text-gold');
    expect(heroText.props.className).toContain('font-display');
    expect(heroText.props.className).toContain('text-3xl');
  });

  it('FR1 SC1.6 — label "Hours This Week" has className text-textSecondary font-sans text-sm', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    const card = json.children?.[0];
    const label = card?.children?.[1];
    expect(label).toBeDefined();
    expect(label.children).toContain('Hours This Week');
    expect(label.props.className).toContain('text-textSecondary');
    expect(label.props.className).toContain('font-sans');
    expect(label.props.className).toContain('text-sm');
  });

  it('FR1 SC1.7 — accent dot has className bg-cyan w-3 h-3 rounded-full mt-2', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    const json = tree.toJSON() as any;
    const card = json.children?.[0];
    const dot = card?.children?.[2];
    expect(dot).toBeDefined();
    expect(dot.props.className).toContain('bg-cyan');
    expect(dot.props.className).toContain('w-3');
    expect(dot.props.className).toContain('h-3');
    expect(dot.props.className).toContain('rounded-full');
    expect(dot.props.className).toContain('mt-2');
  });

  it('FR1 SC1.2 — component has no style={{}} props (uses className only)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NativeWindSmoke));
    });
    // Walk the entire render tree, ensure no node has a non-null/non-undefined `style` prop
    const jsonStr = JSON.stringify(tree.toJSON());
    // NativeWind may inject internal style objects — we check the raw source file instead
    // (see FR1 SC1.2 source check test below)
    expect(jsonStr).toBeDefined(); // tree renders cleanly
  });
});

// ─── FR1 SC1.2 + SC1.9 — source file static checks ───────────────────────────

describe('NativeWindSmoke — FR1 source file checks', () => {
  const SMOKE_FILE = path.resolve(
    __dirname,
    '../../src/components/NativeWindSmoke.tsx'
  );

  it('FR1 SC1.2 — source does not call StyleSheet.create()', () => {
    expect(fs.existsSync(SMOKE_FILE)).toBe(true);
    const source = fs.readFileSync(SMOKE_FILE, 'utf8');
    expect(source).not.toContain('StyleSheet.create(');
  });

  it('FR1 SC1.2 — source does not use style={{ prop (no inline style objects)', () => {
    const source = fs.readFileSync(SMOKE_FILE, 'utf8');
    // Match `style={` which indicates inline or StyleSheet-based styling
    expect(source).not.toMatch(/\bstyle=\{/);
  });

  it('FR1 SC1.9 — source includes temporary smoke-test comment', () => {
    const source = fs.readFileSync(SMOKE_FILE, 'utf8');
    // Must have a comment marking this as temporary
    expect(source).toMatch(/TEMPORARY|temporary|smoke.?test|smoke test/i);
  });
});

// ─── FR2: NativeWindSmoke mounted in index.tsx ────────────────────────────────

describe('NativeWindSmoke — FR2: mounted in home screen', () => {
  const INDEX_FILE = path.resolve(
    __dirname,
    '../../app/(tabs)/index.tsx'
  );

  it('FR2 SC2.1 — index.tsx imports NativeWindSmoke', () => {
    expect(fs.existsSync(INDEX_FILE)).toBe(true);
    const source = fs.readFileSync(INDEX_FILE, 'utf8');
    expect(source).toContain('NativeWindSmoke');
  });

  it('FR2 SC2.1 — NativeWindSmoke is rendered in index.tsx JSX', () => {
    const source = fs.readFileSync(INDEX_FILE, 'utf8');
    // Match JSX usage: <NativeWindSmoke /> or <NativeWindSmoke>
    expect(source).toMatch(/<NativeWindSmoke\s*\/?>|<NativeWindSmoke>/);
  });
});

// ─── FR3: Verification comment in source file ─────────────────────────────────

describe('NativeWindSmoke — FR3: verification documented', () => {
  const SMOKE_FILE = path.resolve(
    __dirname,
    '../../src/components/NativeWindSmoke.tsx'
  );

  it('FR3 SC3.1 — source contains NATIVEWIND_VERIFIED comment', () => {
    expect(fs.existsSync(SMOKE_FILE)).toBe(true);
    const source = fs.readFileSync(SMOKE_FILE, 'utf8');
    expect(source).toContain('NATIVEWIND_VERIFIED');
  });

  it('FR3 SC3.1 — NATIVEWIND_VERIFIED comment includes a date (YYYY-MM-DD format)', () => {
    const source = fs.readFileSync(SMOKE_FILE, 'utf8');
    // Match NATIVEWIND_VERIFIED: followed by a date
    expect(source).toMatch(/NATIVEWIND_VERIFIED:?\s*\d{4}-\d{2}-\d{2}/);
  });
});

// ─── FR3: MEMORY.md updated ───────────────────────────────────────────────────
// MEMORY.md lives at: ~/.claude/projects/-Users-Trilogy-Documents-Claude-Code-WS/memory/MEMORY.md

describe('NativeWindSmoke — FR3: MEMORY.md updated', () => {
  const MEMORY_FILE = path.resolve(
    process.env.HOME || '',
    '.claude/projects/-Users-Trilogy-Documents-Claude-Code-WS/memory/MEMORY.md'
  );

  it('FR3 SC3.2 — MEMORY.md contains NATIVEWIND_VERIFIED entry', () => {
    expect(fs.existsSync(MEMORY_FILE)).toBe(true);
    const source = fs.readFileSync(MEMORY_FILE, 'utf8');
    expect(source).toContain('NATIVEWIND_VERIFIED');
  });
});
