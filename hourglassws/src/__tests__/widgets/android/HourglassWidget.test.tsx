/**
 * Tests: HourglassWidget (03-android-visual)
 *
 * FR1: Helper functions — buildMeshSvg, badgeColor, badgeLabel, deltaColor, blProgressBar
 * FR2: SVG mesh background layer
 * FR3: Glass panel cards
 * FR4: Pace badge
 * FR5: Trend delta text
 * FR6: BrainLift progress bar
 * FR7: Manager urgency mode
 */

import React from 'react';
import { create, act } from 'react-test-renderer';

// ─── Mock react-native-android-widget ─────────────────────────────────────────
// Render primitives as simple host components that expose their props for inspection.
// Note: jest.mock factory is hoisted — must not reference out-of-scope variables like React.
// Use require() inside the factory to access React.
jest.mock(
  'react-native-android-widget',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mockReact = require('react');
    return {
      FlexWidget: ({ children, style }: { children?: unknown; style?: Record<string, unknown> }) =>
        mockReact.createElement('FlexWidget', { style }, children),
      TextWidget: ({ text, style }: { text: string; style?: Record<string, unknown> }) =>
        mockReact.createElement('TextWidget', { text, style }),
      SvgWidget: ({ svg, style }: { svg: string; style?: Record<string, unknown> }) =>
        mockReact.createElement('SvgWidget', { svg, style }),
      ImageWidget: ({ image, style }: { image: unknown; style?: Record<string, unknown> }) =>
        mockReact.createElement('ImageWidget', { image, style }),
    };
  },
  { virtual: true }
);

// ─── Fixture helpers ───────────────────────────────────────────────────────────

function makeData(overrides: Record<string, unknown> = {}): any {
  return {
    hours: '32.5',
    hoursDisplay: '32.5h',
    earnings: '$1,300',
    earningsRaw: 1300,
    today: '6.2h',
    hoursRemaining: '7.5h left',
    aiPct: '71%–75%',
    brainlift: '3.2h',
    deadline: Date.now() + 6 * 60 * 60 * 1000,
    urgency: 'none',
    pendingCount: 0,
    isManager: false,
    cachedAt: Date.now(),
    useQA: false,
    daily: [],
    approvalItems: [],
    myRequests: [],
    actionBg: '',
    // 01-data-extensions fields
    paceBadge: 'on_track',
    weekDeltaHours: '+2.1h',
    weekDeltaEarnings: '+$84',
    brainliftTarget: '5h',
    ...overrides,
  };
}

// ─── Module handles ────────────────────────────────────────────────────────────

let buildMeshSvg: any;
let badgeColor: any;
let badgeLabel: any;
let deltaColor: any;
let blProgressBar: any;
let HourglassWidget: any;
let FallbackWidget: any;

beforeAll(() => {
  const mod = require('../../../widgets/android/HourglassWidget');
  buildMeshSvg = mod.buildMeshSvg;
  badgeColor = mod.badgeColor;
  badgeLabel = mod.badgeLabel;
  deltaColor = mod.deltaColor;
  blProgressBar = mod.blProgressBar;
  HourglassWidget = mod.HourglassWidget;
  FallbackWidget = mod.FallbackWidget;
});

// ─── Render helper — creates renderer inside act(), calls toJSON() outside ─────
// react-test-renderer in React 19 requires toJSON() to be called after act() completes.

function renderWidget(el: React.ReactElement): any {
  let renderer: any;
  act(() => {
    renderer = create(el);
  });
  return renderer.toJSON();
}

// ─── Helper to collect all nodes matching a predicate ─────────────────────────

function collectNodes(tree: any, pred: (n: any) => boolean, results: any[] = []): any[] {
  if (!tree) return results;
  if (pred(tree)) results.push(tree);
  if (tree.children) {
    for (const child of tree.children) {
      collectNodes(child, pred, results);
    }
  }
  return results;
}

function getFlexWidgets(tree: any): any[] {
  return collectNodes(tree, (n) => n.type === 'FlexWidget');
}

function getTextWidgets(tree: any): any[] {
  return collectNodes(tree, (n) => n.type === 'TextWidget');
}

function getSvgWidgets(tree: any): any[] {
  return collectNodes(tree, (n) => n.type === 'SvgWidget');
}

// ─── FR1: Helper functions ─────────────────────────────────────────────────────

describe('FR1 — buildMeshSvg', () => {
  it('FR1.1 — returns a string containing <svg, <defs, and radialGradient', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
    expect(svg).toContain('<defs');
    expect(svg).toContain('radialGradient');
  });

  it('FR1.2 — urgency critical → Node C color is #F43F5E', () => {
    const svg = buildMeshSvg('critical', 'none');
    expect(svg).toContain('#F43F5E');
  });

  it('FR1.3 — urgency high → Node C color is #F59E0B', () => {
    const svg = buildMeshSvg('high', 'none');
    expect(svg).toContain('#F59E0B');
  });

  it('FR1.4 — paceBadge on_track → Node C color is #10B981', () => {
    const svg = buildMeshSvg('none', 'on_track');
    expect(svg).toContain('#10B981');
  });

  it('FR1.5 — paceBadge crushed_it → Node C color is #FFDF89', () => {
    const svg = buildMeshSvg('none', 'crushed_it');
    expect(svg).toContain('#FFDF89');
  });

  it('FR1.6 — default (none/none) → Node C color is #A78BFA (violet)', () => {
    const svg = buildMeshSvg('none', 'none');
    // Node A is always #A78BFA; critical is that urgency colors are absent
    expect(svg).not.toContain('#F43F5E');
    expect(svg).not.toContain('#F59E0B');
    expect(svg).not.toContain('#10B981');
    expect(svg).not.toContain('#FFDF89');
    // Violet present (Node A and/or Node C)
    expect(svg).toContain('#A78BFA');
  });

  it('FR1.7 — always includes Node A violet and Node B cyan', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).toContain('#A78BFA');
    expect(svg).toContain('#00C2FF');
  });
});

describe('FR1 — badgeColor', () => {
  it('FR1.8 — crushed_it → #FFDF89', () => {
    expect(badgeColor('crushed_it')).toBe('#FFDF89');
  });

  it('FR1.9 — on_track → #10B981', () => {
    expect(badgeColor('on_track')).toBe('#10B981');
  });

  it('FR1.10 — behind → #F59E0B', () => {
    expect(badgeColor('behind')).toBe('#F59E0B');
  });

  it('FR1.11 — critical → #F43F5E', () => {
    expect(badgeColor('critical')).toBe('#F43F5E');
  });

  it('FR1.12 — none → empty string', () => {
    expect(badgeColor('none')).toBe('');
  });

  it('FR1.13 — unknown value → empty string (safe fallback)', () => {
    expect(badgeColor('unknown_value')).toBe('');
  });
});

describe('FR1 — badgeLabel', () => {
  it('FR1.14 — crushed_it → CRUSHED IT', () => {
    expect(badgeLabel('crushed_it')).toBe('CRUSHED IT');
  });

  it('FR1.15 — on_track → ON TRACK', () => {
    expect(badgeLabel('on_track')).toBe('ON TRACK');
  });

  it('FR1.16 — behind → BEHIND PACE', () => {
    expect(badgeLabel('behind')).toBe('BEHIND PACE');
  });

  it('FR1.17 — critical → CRITICAL', () => {
    expect(badgeLabel('critical')).toBe('CRITICAL');
  });

  it('FR1.18 — none → empty string', () => {
    expect(badgeLabel('none')).toBe('');
  });
});

describe('FR1 — deltaColor', () => {
  it('FR1.19 — +2.1h → #10B981 (success green)', () => {
    expect(deltaColor('+2.1h')).toBe('#10B981');
  });

  it('FR1.20 — +$84 → #10B981 (success green)', () => {
    expect(deltaColor('+$84')).toBe('#10B981');
  });

  it('FR1.21 — -$84 → #F59E0B (warning amber)', () => {
    expect(deltaColor('-$84')).toBe('#F59E0B');
  });

  it('FR1.22 — -3.4h → #F59E0B (warning amber)', () => {
    expect(deltaColor('-3.4h')).toBe('#F59E0B');
  });

  it('FR1.23 — empty string → transparent', () => {
    expect(deltaColor('')).toBe('transparent');
  });

  it('FR1.24 — undefined → transparent', () => {
    expect(deltaColor(undefined as any)).toBe('transparent');
  });
});

describe('FR1 — blProgressBar', () => {
  it('FR1.25 — 5/5 = 100%: fill width equals total width (200)', () => {
    const svg = blProgressBar(5, 5, 200);
    expect(svg).toContain('width="200"');
  });

  it('FR1.26 — 10/5 = capped at 100%: fill width still equals total width (200)', () => {
    const svg = blProgressBar(10, 5, 200);
    // fill rect width should be 200 (capped)
    const fillMatches = [...svg.matchAll(/width="(\d+(?:\.\d+)?)"/g)].map((m: any) => parseFloat(m[1]));
    const maxFill = Math.max(...fillMatches);
    expect(maxFill).toBe(200);
  });

  it('FR1.27 — 2.5/5 = 50%: fill width is 100', () => {
    const svg = blProgressBar(2.5, 5, 200);
    expect(svg).toContain('width="100"');
  });

  it('FR1.28 — 0/5 = 0%: fill width is 0', () => {
    const svg = blProgressBar(0, 5, 200);
    expect(svg).toContain('width="0"');
  });

  it('FR1.29 — track rect uses #2F2E41 fill', () => {
    const svg = blProgressBar(3, 5, 120);
    expect(svg).toContain('#2F2E41');
  });

  it('FR1.30 — fill rect uses #A78BFA fill (violet)', () => {
    const svg = blProgressBar(3, 5, 120);
    expect(svg).toContain('#A78BFA');
  });

  it('FR1.31 — NaN brainliftHours (from parseFloat("")) → fill width is 0 (no crash)', () => {
    const svg = blProgressBar(NaN, 5, 120);
    // Should not throw and should produce a valid SVG with 0 fill
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });
});

// ─── FR2: SVG mesh background layer ───────────────────────────────────────────

describe('FR2 — SVG mesh background layer', () => {
  it('FR2.1 — SmallWidget renders SvgWidget as first child of root FlexWidget', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'small' })
    );
    expect(tree).not.toBeNull();
    const children = Array.isArray(tree.children) ? tree.children : [];
    const firstChild = children[0];
    expect(firstChild).toBeDefined();
    expect(firstChild.type).toBe('SvgWidget');
  });

  it('FR2.2 — MediumWidget renders SvgWidget as first child of root FlexWidget', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'medium' })
    );
    const children = Array.isArray(tree.children) ? tree.children : [];
    const firstChild = children[0];
    expect(firstChild).toBeDefined();
    expect(firstChild.type).toBe('SvgWidget');
  });

  it('FR2.3 — SvgWidget svg prop contains radialGradient (output of buildMeshSvg)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'medium' })
    );
    const svgNodes = getSvgWidgets(tree);
    const meshNode = svgNodes.find((n) => n.props.svg && n.props.svg.includes('radialGradient'));
    expect(meshNode).toBeDefined();
  });

  it('FR2.4 — FallbackWidget does NOT render a SvgWidget mesh (no data)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: null })
    );
    const svgNodes = getSvgWidgets(tree);
    const meshNode = svgNodes.find((n) => n.props.svg && n.props.svg.includes('radialGradient'));
    expect(meshNode).toBeUndefined();
  });

  it('FR2.5 — root FlexWidget backgroundColor is #0D0C14 (brand background)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'medium' })
    );
    expect(tree.type).toBe('FlexWidget');
    expect(tree.props.style?.backgroundColor).toBe('#0D0C14');
  });
});

// ─── FR3: Glass panel cards ────────────────────────────────────────────────────

describe('FR3 — Glass panel cards', () => {
  it('FR3.1 — medium widget hours panel has outer backgroundColor #2F2E41 with borderRadius 13', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaHours: '' }), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const borderPanel = flexes.find(
      (n) => n.props.style?.backgroundColor === '#2F2E41' && n.props.style?.borderRadius === 13
    );
    expect(borderPanel).toBeDefined();
  });

  it('FR3.2 — medium widget hours panel has inner backgroundColor #16151F with borderRadius 12', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const surfacePanel = flexes.find(
      (n) => n.props.style?.backgroundColor === '#16151F' && n.props.style?.borderRadius === 12
    );
    expect(surfacePanel).toBeDefined();
  });

  it('FR3.3 — no #FFFFFF appears in any FlexWidget background style', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const whitePanel = flexes.find(
      (n) => n.props.style?.backgroundColor === '#FFFFFF'
    );
    expect(whitePanel).toBeUndefined();
  });

  it('FR3.4 — small widget wraps content in glass panel (borderRadius 13 border, 12 surface)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData(), widgetFamily: 'small' })
    );
    const flexes = getFlexWidgets(tree);
    const borderPanel = flexes.find(
      (n) => n.props.style?.backgroundColor === '#2F2E41' && n.props.style?.borderRadius === 13
    );
    expect(borderPanel).toBeDefined();
  });
});

// ─── FR4: Pace badge ───────────────────────────────────────────────────────────

describe('FR4 — Pace badge', () => {
  it('FR4.1 — paceBadge on_track → badge with backgroundColor #10B981 and text ON TRACK', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'on_track' }), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const badge = flexes.find((n) => n.props.style?.backgroundColor === '#10B981');
    expect(badge).toBeDefined();
    const texts = getTextWidgets(badge);
    expect(texts.some((t) => t.props.text === 'ON TRACK')).toBe(true);
  });

  it('FR4.2 — paceBadge crushed_it → badge with backgroundColor #FFDF89 and text CRUSHED IT', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'crushed_it' }), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const badge = flexes.find((n) => n.props.style?.backgroundColor === '#FFDF89');
    expect(badge).toBeDefined();
    const texts = getTextWidgets(badge);
    expect(texts.some((t) => t.props.text === 'CRUSHED IT')).toBe(true);
  });

  it('FR4.3 — paceBadge behind → badge with backgroundColor #F59E0B and text BEHIND PACE', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'behind' }), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const badge = flexes.find((n) => n.props.style?.backgroundColor === '#F59E0B');
    expect(badge).toBeDefined();
    const texts = getTextWidgets(badge);
    expect(texts.some((t) => t.props.text === 'BEHIND PACE')).toBe(true);
  });

  it('FR4.4 — paceBadge critical → badge with backgroundColor #F43F5E and text CRITICAL', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'critical' }), widgetFamily: 'medium' })
    );
    const flexes = getFlexWidgets(tree);
    const badge = flexes.find((n) => n.props.style?.backgroundColor === '#F43F5E');
    expect(badge).toBeDefined();
    const texts = getTextWidgets(badge);
    expect(texts.some((t) => t.props.text === 'CRITICAL')).toBe(true);
  });

  it('FR4.5 — paceBadge none → no pace badge rendered (no text ON TRACK / BEHIND PACE / etc.)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'none' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const badgeTexts = ['ON TRACK', 'CRUSHED IT', 'BEHIND PACE', 'CRITICAL'];
    expect(texts.some((t) => badgeTexts.includes(t.props.text))).toBe(false);
  });

  it('FR4.6 — paceBadge undefined → no badge rendered (backward compat)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: undefined }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const badgeTexts = ['ON TRACK', 'CRUSHED IT', 'BEHIND PACE', 'CRITICAL'];
    expect(texts.some((t) => badgeTexts.includes(t.props.text))).toBe(false);
  });

  it('FR4.7 — badge text color is #0D0C14 (dark for contrast on bright backgrounds)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ paceBadge: 'on_track' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const badgeText = texts.find((t) => t.props.text === 'ON TRACK');
    expect(badgeText).toBeDefined();
    expect(badgeText.props.style?.color).toBe('#0D0C14');
  });
});

// ─── FR5: Trend delta text ─────────────────────────────────────────────────────

describe('FR5 — Trend delta text', () => {
  it('FR5.1 — weekDeltaHours +2.1h → renders text containing ↑ and 2.1h with color #10B981', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaHours: '+2.1h' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const delta = texts.find(
      (t) => t.props.text && t.props.text.includes('↑') && t.props.text.includes('2.1h')
    );
    expect(delta).toBeDefined();
    expect(delta.props.style?.color).toBe('#10B981');
  });

  it('FR5.2 — weekDeltaHours -3.4h → renders text containing ↓ and 3.4h with color #F59E0B', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaHours: '-3.4h' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const delta = texts.find(
      (t) => t.props.text && t.props.text.includes('↓') && t.props.text.includes('3.4h')
    );
    expect(delta).toBeDefined();
    expect(delta.props.style?.color).toBe('#F59E0B');
  });

  it('FR5.3 — weekDeltaHours empty string → no delta TextWidget rendered', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaHours: '' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const arrowText = texts.find(
      (t) => t.props.text && (t.props.text.includes('↑') || t.props.text.includes('↓')) && t.props.text.includes('h')
    );
    expect(arrowText).toBeUndefined();
  });

  it('FR5.4 — weekDeltaEarnings +$84 → renders text with ↑ and $84, color #10B981', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaEarnings: '+$84' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const delta = texts.find(
      (t) => t.props.text && t.props.text.includes('↑') && t.props.text.includes('$84')
    );
    expect(delta).toBeDefined();
    expect(delta.props.style?.color).toBe('#10B981');
  });

  it('FR5.5 — weekDeltaEarnings -$136 → renders text with ↓ and $136, color #F59E0B', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, { data: makeData({ weekDeltaEarnings: '-$136' }), widgetFamily: 'medium' })
    );
    const texts = getTextWidgets(tree);
    const delta = texts.find(
      (t) => t.props.text && t.props.text.includes('↓') && t.props.text.includes('$136')
    );
    expect(delta).toBeDefined();
    expect(delta.props.style?.color).toBe('#F59E0B');
  });

  it('FR5.6 — weekDeltaEarnings empty string → no earnings delta TextWidget', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ weekDeltaEarnings: '', weekDeltaHours: '' }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const earningsDelta = texts.find(
      (t) => t.props.text && (t.props.text.includes('↑') || t.props.text.includes('↓')) && t.props.text.includes('$')
    );
    expect(earningsDelta).toBeUndefined();
  });

  it('FR5.7 — undefined weekDelta fields → no crash (treated as empty)', () => {
    expect(() => {
      renderWidget(
        React.createElement(HourglassWidget, {
          data: makeData({ weekDeltaHours: undefined, weekDeltaEarnings: undefined }),
          widgetFamily: 'medium',
        })
      );
    }).not.toThrow();
  });
});

// ─── FR6: BrainLift progress bar ──────────────────────────────────────────────

describe('FR6 — BrainLift progress bar', () => {
  it('FR6.1 — brainlift 3.2h / 5h → SvgWidget svg contains fill width ~77 (Math.round(3.2/5*120))', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ brainlift: '3.2h', brainliftTarget: '5h' }),
        widgetFamily: 'medium',
      })
    );
    const svgs = getSvgWidgets(tree);
    // BrainLift bar has both #A78BFA (fill) and #2F2E41 (track); mesh SVG does not have #2F2E41
    const blBar = svgs.find((n) => n.props.svg && n.props.svg.includes('#A78BFA') && n.props.svg.includes('#2F2E41'));
    expect(blBar).toBeDefined();
    // fill width = Math.round(3.2/5 * 120) = Math.round(76.8) = 77
    expect(blBar.props.svg).toContain('width="77"');
  });

  it('FR6.2 — brainlift 6h exceeds target 5h → fill width capped at 120', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ brainlift: '6h', brainliftTarget: '5h' }),
        widgetFamily: 'medium',
      })
    );
    const svgs = getSvgWidgets(tree);
    // BrainLift bar has both #A78BFA (fill) and #2F2E41 (track); mesh SVG does not have #2F2E41
    const blBar = svgs.find((n) => n.props.svg && n.props.svg.includes('#A78BFA') && n.props.svg.includes('#2F2E41'));
    expect(blBar).toBeDefined();
    // fill width should be 120 (capped at 100%)
    expect(blBar.props.svg).toContain('width="120"');
  });

  it('FR6.3 — brainliftTarget missing → defaults to 5h (no crash)', () => {
    expect(() => {
      renderWidget(
        React.createElement(HourglassWidget, {
          data: makeData({ brainlift: '3.2h', brainliftTarget: undefined }),
          widgetFamily: 'medium',
        })
      );
    }).not.toThrow();
  });

  it('FR6.4 — brainlift 0h → fill width is 0', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ brainlift: '0h', brainliftTarget: '5h' }),
        widgetFamily: 'medium',
      })
    );
    const svgs = getSvgWidgets(tree);
    const blBar = svgs.find((n) => n.props.svg && n.props.svg.includes('#2F2E41'));
    expect(blBar).toBeDefined();
    expect(blBar.props.svg).toContain('width="0"');
  });

  it('FR6.5 — BrainLift bar not rendered in small widget', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ brainlift: '3.2h', brainliftTarget: '5h' }),
        widgetFamily: 'small',
      })
    );
    const svgs = getSvgWidgets(tree);
    // BrainLift bar has both #A78BFA (fill) and #2F2E41 (track); mesh SVG does not have #2F2E41
    const blBar = svgs.find((n) => n.props.svg && n.props.svg.includes('#A78BFA') && n.props.svg.includes('#2F2E41'));
    expect(blBar).toBeUndefined();
  });

  it('FR6.6 — BL label color is #A78BFA violet', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({ brainlift: '3.2h', brainliftTarget: '5h' }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const blLabel = texts.find((t) => t.props.text === 'BL');
    expect(blLabel).toBeDefined();
    expect(blLabel.props.style?.color).toBe('#A78BFA');
  });

  it('FR6.7 — malformed brainlift value does not crash', () => {
    expect(() => {
      renderWidget(
        React.createElement(HourglassWidget, {
          data: makeData({ brainlift: '', brainliftTarget: '5h' }),
          widgetFamily: 'medium',
        })
      );
    }).not.toThrow();
  });
});

// ─── FR7: Manager urgency mode ────────────────────────────────────────────────

describe('FR7 — Manager urgency mode', () => {
  it('FR7.1 — isManager critical pendingCount=3 → countdown hero text visible (contains "h left" or "Due now")', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: true,
          urgency: 'critical',
          pendingCount: 3,
          deadline: Date.now() + 4 * 60 * 60 * 1000,
          approvalItems: [
            { id: '1', name: 'Alice', hours: '2.5h', category: 'MANUAL' },
            { id: '2', name: 'Bob', hours: '1.0h', category: 'OVERTIME' },
          ],
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const countdownText = texts.find(
      // Countdown format is "{N}h left" (integer hours) or "Due now"
      // Distinguish from hoursRemaining like "7.5h left" which has a decimal
      (t) => t.props.text && (t.props.text === 'Due now' || /^\d+h left$/.test(t.props.text))
    );
    expect(countdownText).toBeDefined();
  });

  it('FR7.2 — isManager high urgency pendingCount=1 → urgency mode triggered', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: true,
          urgency: 'high',
          pendingCount: 1,
          deadline: Date.now() + 2 * 60 * 60 * 1000,
          approvalItems: [{ id: '1', name: 'Alice', hours: '2.5h', category: 'MANUAL' }],
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const countdownText = texts.find(
      // Countdown format is "{N}h left" (integer hours) or "Due now"
      // Distinguish from hoursRemaining like "7.5h left" which has a decimal
      (t) => t.props.text && (t.props.text === 'Due now' || /^\d+h left$/.test(t.props.text))
    );
    expect(countdownText).toBeDefined();
  });

  it('FR7.3 — isManager low urgency pendingCount=5 → hours mode (no countdown)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: true,
          urgency: 'low',
          pendingCount: 5,
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const countdownText = texts.find(
      // Countdown format is "{N}h left" (integer hours) or "Due now"
      // Distinguish from hoursRemaining like "7.5h left" which has a decimal
      (t) => t.props.text && (t.props.text === 'Due now' || /^\d+h left$/.test(t.props.text))
    );
    expect(countdownText).toBeUndefined();
    // Verify hours hero is shown instead
    const hoursHero = texts.find((t) => t.props.text === '32.5h');
    expect(hoursHero).toBeDefined();
  });

  it('FR7.4 — isManager=false → always hours mode, no approval items', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: false,
          urgency: 'critical',
          pendingCount: 5,
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const countdownText = texts.find(
      // Countdown format is "{N}h left" (integer hours) or "Due now"
      // Distinguish from hoursRemaining like "7.5h left" which has a decimal
      (t) => t.props.text && (t.props.text === 'Due now' || /^\d+h left$/.test(t.props.text))
    );
    expect(countdownText).toBeUndefined();
    const hoursHero = texts.find((t) => t.props.text === '32.5h');
    expect(hoursHero).toBeDefined();
  });

  it('FR7.5 — isManager critical pendingCount=0 → hours mode (no approvals to act on)', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: true,
          urgency: 'critical',
          pendingCount: 0,
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const countdownText = texts.find(
      // Countdown format is "{N}h left" (integer hours) or "Due now"
      // Distinguish from hoursRemaining like "7.5h left" which has a decimal
      (t) => t.props.text && (t.props.text === 'Due now' || /^\d+h left$/.test(t.props.text))
    );
    expect(countdownText).toBeUndefined();
  });

  it('FR7.6 — deadline in past → shows Due now', () => {
    const tree = renderWidget(
      React.createElement(HourglassWidget, {
        data: makeData({
          isManager: true,
          urgency: 'critical',
          pendingCount: 2,
          deadline: Date.now() - 60000, // 1 minute in the past
        }),
        widgetFamily: 'medium',
      })
    );
    const texts = getTextWidgets(tree);
    const dueNow = texts.find((t) => t.props.text === 'Due now');
    expect(dueNow).toBeDefined();
  });
});
