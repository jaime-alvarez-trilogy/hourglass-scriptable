// Tests: AIArcHero component (04-ai-hero-arc)
// FR1: AIArcHero component — arc gauge + bold AI% center
// FR2: BrainLift secondary metric
// FR3: Ambient signal contract (getAmbientColor — already covered in AmbientBackground.test.tsx,
//       but boundary cases verified here for completeness)
// FR6: arcPath pure utility function
//
// Mock strategy:
// - react-native-svg: passthrough Fragment components (same pattern as AmbientBackground.test.tsx)
// - expo-blur: BlurView passthrough (Card uses BlurView)
// - react-native-reanimated: __mocks__ auto-mock via jest-expo preset
// - Source analysis for structure/contract checks

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-blur', () => {
  const mockReact = require('react');
  return {
    __esModule: true,
    BlurView: ({ children, intensity, tint, style }: any) =>
      mockReact.createElement('BlurView', { intensity, tint, style }, children ?? null),
  };
});

jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const wrap = (name: string) => ({ children, ...rest }: any) =>
    mockReact.createElement(name, rest, children ?? null);
  return {
    __esModule: true,
    default: wrap('Svg'),
    Svg: wrap('Svg'),
    Defs: wrap('Defs'),
    Path: wrap('Path'),
    G: wrap('G'),
    Circle: wrap('Circle'),
    Line: wrap('Line'),
    Text: wrap('SvgText'),
  };
});

// ─── File paths ────────────────────────────────────────────────────────────────

const COMPONENT_FILE = path.resolve(__dirname, '../AIArcHero.tsx');

// ─── Module handles ───────────────────────────────────────────────────────────

let AIArcHero: any;
let arcPath: any;
let AI_TARGET_PCT: number;
let BRAINLIFT_TARGET_HOURS: number;

beforeAll(() => {
  const mod = require('../AIArcHero');
  AIArcHero = mod.default;
  arcPath = mod.arcPath;
  AI_TARGET_PCT = mod.AI_TARGET_PCT;
  BRAINLIFT_TARGET_HOURS = mod.BRAINLIFT_TARGET_HOURS;
});

// ─── Default props fixture ────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  aiPct: 75,
  brainliftHours: 3.5,
  deltaPercent: null,
  ambientColor: '#A78BFA',
};

// ─── FR6: arcPath pure utility function ──────────────────────────────────────

describe('arcPath — FR6: SVG arc path generation', () => {
  it('FR6.1 — degenerate case: start === end returns string starting with "M" (no crash)', () => {
    const result = arcPath(90, 90, 80, 135, 135);
    expect(typeof result).toBe('string');
    expect(result.startsWith('M')).toBe(true);
  });

  it('FR6.2 — full 270° arc: start=135, end=405 returns valid arc path', () => {
    const result = arcPath(90, 90, 80, 135, 405);
    expect(typeof result).toBe('string');
    expect(result.startsWith('M')).toBe(true);
    expect(result).toContain('A');
  });

  it('FR6.3 — 135° (50%) arc: start=135, end=270 returns valid arc path', () => {
    const result = arcPath(90, 90, 80, 135, 270);
    expect(typeof result).toBe('string');
    expect(result.startsWith('M')).toBe(true);
    expect(result).toContain('A');
  });

  it('FR6.4 — large arc flag = 1 when sweep > 180°', () => {
    // 270° sweep
    const result = arcPath(90, 90, 80, 135, 405);
    // The arc command: M ... A r r 0 largeArcFlag sweepFlag x2 y2
    // largeArcFlag appears after "0 " in "A 80 80 0 1 1 ..."
    expect(result).toMatch(/A\s+[\d.]+\s+[\d.]+\s+0\s+1\s+1/);
  });

  it('FR6.5 — large arc flag = 0 when sweep ≤ 180°', () => {
    // 135° sweep (50% of 270)
    const result = arcPath(90, 90, 80, 135, 270);
    // largeArcFlag = 0
    expect(result).toMatch(/A\s+[\d.]+\s+[\d.]+\s+0\s+0\s+1/);
  });

  it('FR6.6 — returned string always starts with "M" for any valid input', () => {
    expect(arcPath(50, 50, 40, 0, 90).startsWith('M')).toBe(true);
    expect(arcPath(100, 100, 80, 45, 225).startsWith('M')).toBe(true);
    expect(arcPath(90, 90, 80, 135, 360).startsWith('M')).toBe(true);
  });

  it('FR6.7 — arc coordinates are numeric (not NaN)', () => {
    const result = arcPath(90, 90, 80, 135, 270);
    // Extract numbers from the path — none should be NaN
    const numbers = result.match(/-?[\d.]+/g) ?? [];
    numbers.forEach(n => {
      expect(isNaN(parseFloat(n))).toBe(false);
    });
  });
});

// ─── FR1: AIArcHero component — arc gauge + bold AI% center ──────────────────

describe('AIArcHero — FR1: arc gauge component', () => {
  it('FR1.1 — renders without crash for aiPct=0', () => {
    expect(() => {
      act(() => {
        create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, aiPct: 0 }));
      });
    }).not.toThrow();
  });

  it('FR1.2 — renders without crash for aiPct=50', () => {
    expect(() => {
      act(() => {
        create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, aiPct: 50 }));
      });
    }).not.toThrow();
  });

  it('FR1.3 — renders without crash for aiPct=100', () => {
    expect(() => {
      act(() => {
        create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, aiPct: 100 }));
      });
    }).not.toThrow();
  });

  it('FR1.4 — bold AI% number is visible as center text (e.g. "75%")', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, aiPct: 75 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('75%');
  });

  it('FR1.5 — "AI USAGE" label is rendered', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('AI USAGE');
  });

  it('FR1.6 — delta badge is rendered when deltaPercent is not null', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, deltaPercent: 5 }));
    });
    const instance = tree.root;
    const badge = instance.findAll((node: any) => node.props?.testID === 'delta-badge');
    expect(badge.length).toBeGreaterThan(0);
  });

  it('FR1.7 — delta badge is NOT rendered when deltaPercent is null', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, deltaPercent: null }));
    });
    const instance = tree.root;
    const badge = instance.findAll((node: any) => node.props?.testID === 'delta-badge');
    expect(badge.length).toBe(0);
  });

  it('FR1.8 — delta badge shows "+" prefix and success color when deltaPercent > 0', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, deltaPercent: 3.5 }));
    });
    const json = JSON.stringify(tree.toJSON());
    // Should contain +3.5%
    expect(json).toContain('+3.5%');
  });

  it('FR1.9 — delta badge shows negative and critical color when deltaPercent < 0', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, deltaPercent: -2.1 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('-2.1%');
  });

  it('FR1.10 — delta badge shows "+0.0%" when deltaPercent === 0', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, deltaPercent: 0 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('+0.0%');
  });

  it('FR1.11 — default size is 180dp when size prop is omitted', () => {
    const source = fs.readFileSync(COMPONENT_FILE, 'utf8');
    // Default parameter: size = 180
    expect(source).toMatch(/size\s*=\s*180/);
  });

  it('FR1.12 — AI_TARGET_PCT exported constant equals 75', () => {
    expect(AI_TARGET_PCT).toBe(75);
  });

  it('FR1.13 — component does not import AIRingChart', () => {
    const source = fs.readFileSync(COMPONENT_FILE, 'utf8');
    expect(source).not.toContain('AIRingChart');
  });
});

// ─── FR2: BrainLift secondary metric ─────────────────────────────────────────

describe('AIArcHero — FR2: BrainLift secondary metric', () => {
  it('FR2.1 — renders "{brainliftHours.toFixed(1)}h / 5h" text', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, brainliftHours: 3.5 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('3.5h');
    expect(json).toContain('5h');
  });

  it('FR2.2 — BRAINLIFT_TARGET_HOURS exported constant equals 5', () => {
    expect(BRAINLIFT_TARGET_HOURS).toBe(5);
  });

  it('FR2.3 — brainliftHours=0 renders "0.0h / 5h" with no crash', () => {
    let tree: any;
    expect(() => {
      act(() => {
        tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, brainliftHours: 0 }));
      });
    }).not.toThrow();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('0.0h');
  });

  it('FR2.4 — brainliftHours=5 renders "5.0h / 5h"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, brainliftHours: 5 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('5.0h');
  });

  it('FR2.5 — brainliftHours=7.3 renders "7.3h" text (actual hours shown)', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(AIArcHero, { ...DEFAULT_PROPS, brainliftHours: 7.3 }));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('7.3h');
  });

  it('FR2.6 — source uses Math.min(1, brainliftHours / BRAINLIFT_TARGET_HOURS) for progress clamping', () => {
    const source = fs.readFileSync(COMPONENT_FILE, 'utf8');
    expect(source).toMatch(/Math\.min\s*\(\s*1/);
  });

  it('FR2.7 — source renders ProgressBar with colorClass="bg-violet"', () => {
    const source = fs.readFileSync(COMPONENT_FILE, 'utf8');
    expect(source).toContain('bg-violet');
    expect(source).toContain('ProgressBar');
  });
});

// ─── FR3: getAmbientColor aiPct contract — boundary verification ──────────────

describe('getAmbientColor — FR3: aiPct signal boundaries', () => {
  let getAmbientColor: any;

  beforeAll(() => {
    const mod = require('../AmbientBackground');
    getAmbientColor = mod.getAmbientColor;
  });

  it('FR3.1 — pct=80 → colors.violet (#A78BFA)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 80 })).toBe('#A78BFA');
  });

  it('FR3.2 — pct=65 → colors.cyan (#00C2FF)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 65 })).toBe('#00C2FF');
  });

  it('FR3.3 — pct=50 → colors.warning (#F59E0B)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 50 })).toBe('#F59E0B');
  });

  it('FR3.4 — pct=75 (boundary) → colors.violet (#A78BFA)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 75 })).toBe('#A78BFA');
  });

  it('FR3.5 — pct=60 (boundary) → colors.cyan (#00C2FF)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 60 })).toBe('#00C2FF');
  });

  it('FR3.6 — pct=0 → colors.warning (#F59E0B)', () => {
    expect(getAmbientColor({ type: 'aiPct', pct: 0 })).toBe('#F59E0B');
  });
});

// ─── FR1: Source file structure checks ───────────────────────────────────────

describe('AIArcHero — source structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(COMPONENT_FILE, 'utf8');
  });

  it('source exports arcPath function', () => {
    expect(source).toMatch(/export\s+function\s+arcPath/);
  });

  it('source exports AI_TARGET_PCT constant', () => {
    expect(source).toMatch(/export\s+const\s+AI_TARGET_PCT/);
  });

  it('source exports BRAINLIFT_TARGET_HOURS constant', () => {
    expect(source).toMatch(/export\s+const\s+BRAINLIFT_TARGET_HOURS/);
  });

  it('source uses react-native-svg Path for arc rendering', () => {
    expect(source).toContain('react-native-svg');
    expect(source).toContain('Path');
  });

  it('source imports springPremium for arc fill animation', () => {
    expect(source).toContain('springPremium');
  });

  it('source uses useSharedValue for animated arc end angle', () => {
    expect(source).toContain('useSharedValue');
  });

  it('source uses useEffect to trigger animation on aiPct change', () => {
    expect(source).toContain('useEffect');
  });

  it('source imports Card component', () => {
    expect(source).toContain('Card');
  });
});
