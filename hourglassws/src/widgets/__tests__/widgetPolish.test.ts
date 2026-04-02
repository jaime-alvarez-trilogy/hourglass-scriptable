// Tests: 01-widget-polish
//
// FR1: Small widget content triage (iOS + Android)
//   SC1.1–SC1.7  — iOS SmallWidget: no earnings, no hoursRemaining; paceBadge, stale, manager badge
//   SC1.8–SC1.10 — Android SmallWidget: no earnings, no hoursRemaining; hoursDisplay present
//
// FR2: iOS Large padding
//   SC2.1 — outer VStack padding equals 16
//
// FR3: Android SVG background replacement
//   SC3.1–SC3.8 — linearGradient present, no ellipse/radialGradient, state colors, dimensions
//
// FR4: todayDelta data field
//   SC4.1–SC4.5 — computeTodayDelta() unit tests
//   SC4.6–SC4.9 — buildWidgetData() integration
//   SC4.10–SC4.12 — iOS LargeWidget rendering
//
// FR5: Progress bar height and labels
//   SC5.1–SC5.5 — blProgressBar height=8, BrainLift label, AI Usage label
//
// Strategy:
// - Import computeTodayDelta, buildMeshSvg, blProgressBar directly (all exported)
// - Read iOS HourglassWidget.tsx source as string for JSX assertions
// - Use bridge.ts exported buildWidgetData via test-harness wrapper (indirect via updateWidgetData)
//   or directly by reading the source — prefer direct import patterns for pure functions
// - For Android widget renders: use toString/JSON assertions on component source strings

import * as path from 'path';
import * as fs from 'fs';
import { buildMeshSvg, blProgressBar } from '../android/HourglassWidget';

// ─── Paths ─────────────────────────────────────────────────────────────────────

const IOS_WIDGET_FILE = path.resolve(__dirname, '../ios/HourglassWidget.tsx');
const BRIDGE_FILE = path.resolve(__dirname, '../bridge.ts');

// ─── Source readers ─────────────────────────────────────────────────────────────

function readIosWidget(): string {
  return fs.readFileSync(IOS_WIDGET_FILE, 'utf8');
}

function readBridge(): string {
  return fs.readFileSync(BRIDGE_FILE, 'utf8');
}

// ─── computeTodayDelta import helper ───────────────────────────────────────────
// We import computeTodayDelta by dynamic require after confirming it's exported.
// The bridge.ts file uses React Native imports that don't resolve in Jest/node,
// so we extract and eval the pure function from source instead.

function extractComputeTodayDelta(): (today: number, average: number) => string {
  const src = readBridge();
  // Extract the function body: find `function computeTodayDelta` ... first `}` after it
  const fnStart = src.indexOf('function computeTodayDelta(');
  if (fnStart === -1) throw new Error('computeTodayDelta not found in bridge.ts');
  // Find the closing brace of the function — simple brace counting
  let depth = 0;
  let i = fnStart;
  let started = false;
  while (i < src.length) {
    if (src[i] === '{') { depth++; started = true; }
    if (src[i] === '}') { depth--; if (started && depth === 0) { i++; break; } }
    i++;
  }
  let fnSrc = src.slice(fnStart, i);
  // Strip TypeScript type annotations from parameters and return type
  // e.g. `function computeTodayDelta(today: number, average: number): string`
  // → `function computeTodayDelta(today, average)`
  fnSrc = fnSrc
    .replace(/function computeTodayDelta\([^)]*\)(?:\s*:\s*\w+)?/, (match) => {
      // Remove param type annotations and return type
      return match
        .replace(/:\s*\w+/g, '') // remove `: type` annotations
        .replace(/\(\s*\)/, '()'); // clean up empty parens if needed
    });
  // eslint-disable-next-line no-new-func
  const fn = new Function('return (' + fnSrc + ')')();
  return fn as (today: number, average: number) => string;
}

// ─── FR1: iOS SmallWidget source assertions ─────────────────────────────────────

describe('FR1: iOS SmallWidget content triage', () => {
  let src: string;
  // Isolate just the SmallWidget function
  let smallWidgetSrc: string;

  beforeAll(() => {
    src = readIosWidget();
    // Extract SmallWidget function body: from `function SmallWidget` to next top-level `function`
    const start = src.indexOf('function SmallWidget(');
    const nextFn = src.indexOf('\nfunction MediumWidget(', start);
    smallWidgetSrc = src.slice(start, nextFn);
  });

  it('SC1.1: SmallWidget does NOT render earnings (props.earnings)', () => {
    // earnings field should not appear in SmallWidget JSX after polish
    expect(smallWidgetSrc).not.toContain('props.earnings');
  });

  it('SC1.2: SmallWidget does NOT render hoursRemaining (props.hoursRemaining)', () => {
    expect(smallWidgetSrc).not.toContain('props.hoursRemaining');
  });

  it('SC1.3: SmallWidget DOES render hoursDisplay (props.hoursDisplay)', () => {
    expect(smallWidgetSrc).toContain('props.hoursDisplay');
  });

  it('SC1.4: SmallWidget renders paceBadge status text conditionally', () => {
    // Must reference paceBadge in SmallWidget to show status
    expect(smallWidgetSrc).toContain('props.paceBadge');
  });

  it('SC1.5: SmallWidget paceBadge=none guard exists (no render for none)', () => {
    // The source must guard against rendering when badge is 'none' or empty
    // Either via PACE_LABELS lookup (falsy for 'none') or explicit !== 'none' check
    const hasPaceLabels = src.includes('PACE_LABELS');
    const hasNoneGuard = smallWidgetSrc.includes("!== 'none'") || smallWidgetSrc.includes('PACE_LABELS');
    expect(hasPaceLabels || hasNoneGuard).toBe(true);
  });

  it('SC1.6: SmallWidget still renders manager badge (isManager + pendingCount)', () => {
    expect(smallWidgetSrc).toContain('props.isManager');
    expect(smallWidgetSrc).toContain('props.pendingCount');
  });

  it('SC1.7: SmallWidget still renders stale indicator (isStale / cachedAt)', () => {
    // isStale call or cachedAt reference must be in SmallWidget
    expect(smallWidgetSrc).toMatch(/isStale|cachedAt/);
  });
});

// ─── FR1: Android SmallWidget source assertions ──────────────────────────────────

describe('FR1: Android SmallWidget content triage', () => {
  let androidSrc: string;
  let smallWidgetSrc: string;

  beforeAll(() => {
    const androidFile = path.resolve(__dirname, '../android/HourglassWidget.tsx');
    androidSrc = fs.readFileSync(androidFile, 'utf8');
    // Extract Android SmallWidget function body
    const start = androidSrc.indexOf('function SmallWidget(');
    // Next top-level function after SmallWidget
    const nextFn = androidSrc.indexOf('\n// ─── Action mode', start);
    smallWidgetSrc = nextFn > start
      ? androidSrc.slice(start, nextFn)
      : androidSrc.slice(start, start + 400);
  });

  it('SC1.8: Android SmallWidget does NOT render data.earnings', () => {
    expect(smallWidgetSrc).not.toContain('data.earnings');
  });

  it('SC1.9: Android SmallWidget does NOT render data.hoursRemaining', () => {
    expect(smallWidgetSrc).not.toContain('data.hoursRemaining');
  });

  it('SC1.10: Android SmallWidget DOES render data.hoursDisplay', () => {
    expect(smallWidgetSrc).toContain('data.hoursDisplay');
  });
});

// ─── FR2: iOS LargeWidget padding ────────────────────────────────────────────────

describe('FR2: iOS LargeWidget padding', () => {
  let largeWidgetSrc: string;

  beforeAll(() => {
    const src = readIosWidget();
    const start = src.indexOf('function LargeWidget(');
    const nextFn = src.indexOf('\n// ─── Main widget', start);
    largeWidgetSrc = src.slice(start, nextFn);
  });

  it('SC2.1: LargeWidget outer VStack uses padding={16}', () => {
    expect(largeWidgetSrc).toContain('padding={16}');
  });

  it('SC2.2: LargeWidget outer VStack uses object-form padding (padding={{ top: 16...})', () => {
    // The outer VStack uses object-form padding {top:16, leading:16, trailing:16, bottom:28}
    // not a scalar integer. This is more precise than a negative check.
    expect(largeWidgetSrc).toContain('padding={{ top: 16');
  });
});

// ─── FR3: Android SVG background replacement ─────────────────────────────────────

describe('FR3: buildMeshSvg() — linear gradient replacement', () => {
  it('SC3.1: contains <linearGradient', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).toContain('<linearGradient');
  });

  it('SC3.2: does NOT contain <ellipse', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).not.toContain('<ellipse');
  });

  it('SC3.3: does NOT contain <radialGradient', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).not.toContain('<radialGradient');
  });

  it('SC3.4: state color from meshStateColor() appears in output', () => {
    // urgency=none, paceBadge=none → violet #A78BFA
    const svg = buildMeshSvg('none', 'none');
    expect(svg).toContain('#A78BFA');
  });

  it('SC3.5: urgency=critical → state color #F43F5E in output', () => {
    const svg = buildMeshSvg('critical', 'none');
    expect(svg).toContain('#F43F5E');
  });

  it('SC3.6: urgency=none, paceBadge=on_track → state color #10B981 in output', () => {
    const svg = buildMeshSvg('none', 'on_track');
    expect(svg).toContain('#10B981');
  });

  it('SC3.7: urgency=none, paceBadge=none → state color #A78BFA in output', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).toContain('#A78BFA');
  });

  it('SC3.8: SVG canvas dimensions remain 360x200', () => {
    const svg = buildMeshSvg('none', 'none');
    expect(svg).toContain('width="360"');
    expect(svg).toContain('height="200"');
  });
});

// ─── FR4: computeTodayDelta ───────────────────────────────────────────────────────

describe('FR4: computeTodayDelta()', () => {
  let computeTodayDelta: (today: number, average: number) => string;

  beforeAll(() => {
    computeTodayDelta = extractComputeTodayDelta();
  });

  it('SC4.1: (6.2, 5.0) === "+1.2h"', () => {
    expect(computeTodayDelta(6.2, 5.0)).toBe('+1.2h');
  });

  it('SC4.2: (3.8, 5.0) === "-1.2h"', () => {
    expect(computeTodayDelta(3.8, 5.0)).toBe('-1.2h');
  });

  it('SC4.3: (5.0, 5.0) === "+0.0h"', () => {
    expect(computeTodayDelta(5.0, 5.0)).toBe('+0.0h');
  });

  it('SC4.4: (6.2, 0) === "" (no average)', () => {
    expect(computeTodayDelta(6.2, 0)).toBe('');
  });

  it('SC4.5: (0, 0) === "" (no average)', () => {
    expect(computeTodayDelta(0, 0)).toBe('');
  });
});

describe('FR4: bridge.ts buildWidgetData() — todayDelta field', () => {
  it('SC4.6: buildWidgetData result shape includes todayDelta field', () => {
    const src = readBridge();
    // The main return should include todayDelta
    expect(src).toContain('todayDelta');
  });

  it('SC4.7: todayDelta computed from hoursData.today and hoursData.average', () => {
    const src = readBridge();
    // computeTodayDelta must be called with hoursData.today and hoursData.average
    expect(src).toContain('computeTodayDelta(hoursData.today, hoursData.average)');
  });

  it('SC4.9: null-guard return includes todayDelta: empty string', () => {
    const src = readBridge();
    // The guard return (hoursData === null path) must include todayDelta: ''
    // Find the null-guard block
    const guardStart = src.indexOf('if (!hoursData)');
    const guardEnd = src.indexOf('const deadlineMs =', guardStart);
    const guardBlock = src.slice(guardStart, guardEnd);
    expect(guardBlock).toContain("todayDelta: ''");
  });
});

describe('FR4: iOS LargeWidget — Today row uses todayDelta not hoursRemaining', () => {
  let largeWidgetSrc: string;
  let todayRowSrc: string;

  beforeAll(() => {
    const src = readIosWidget();
    const start = src.indexOf('function LargeWidget(');
    const nextFn = src.indexOf('\n// ─── Main widget', start);
    largeWidgetSrc = src.slice(start, nextFn);

    // Find the Today row section (HStack containing "Today:")
    const todayIdx = largeWidgetSrc.indexOf('Today:');
    // Extract a window around the Today row
    todayRowSrc = largeWidgetSrc.slice(
      Math.max(0, todayIdx - 50),
      todayIdx + 400
    );
  });

  it('SC4.10: Today row right side does NOT use props.hoursRemaining', () => {
    // The right-side element in the Today HStack should not be hoursRemaining
    expect(todayRowSrc).not.toContain('props.hoursRemaining');
  });

  it('SC4.11: LargeWidget references props.todayDelta', () => {
    expect(largeWidgetSrc).toContain('props.todayDelta');
  });

  it('SC4.12: todayDelta is rendered conditionally (guard for empty string)', () => {
    // Must have a conditional render: todayDelta && ... or todayDelta !== ''
    const hasConditional =
      largeWidgetSrc.includes('todayDelta &&') ||
      largeWidgetSrc.includes("todayDelta !== ''") ||
      largeWidgetSrc.includes('todayDelta.length > 0');
    expect(hasConditional).toBe(true);
  });
});

// ─── FR5: blProgressBar height and labels ─────────────────────────────────────────

describe('FR5: blProgressBar() height', () => {
  it('SC5.1: SVG contains height="8"', () => {
    const svg = blProgressBar(3, 5, 120);
    expect(svg).toContain('height="8"');
  });

  it('SC5.2: SVG does NOT contain height="6"', () => {
    const svg = blProgressBar(3, 5, 120);
    expect(svg).not.toContain('height="6"');
  });
});

describe('FR5: Android MediumWidget Hours mode labels', () => {
  let mediumHoursSrc: string;

  beforeAll(() => {
    const androidFile = path.resolve(__dirname, '../android/HourglassWidget.tsx');
    const src = fs.readFileSync(androidFile, 'utf8');
    // Extract the Hours mode section (after all early-return mode blocks)
    const hoursStart = src.indexOf('// ─── Hours mode (standard display)');
    mediumHoursSrc = hoursStart > -1 ? src.slice(hoursStart) : src;
  });

  it('SC5.3: Hours mode contains "BrainLift" label', () => {
    expect(mediumHoursSrc).toContain('"BrainLift"');
  });

  it('SC5.4: Hours mode does NOT contain standalone "BL" label text', () => {
    // "BL" as a standalone TextWidget label (text="BL") should be gone
    expect(mediumHoursSrc).not.toContain('text="BL"');
  });

  it('SC5.5: Hours mode stats row contains "AI Usage:" label', () => {
    expect(mediumHoursSrc).toContain('AI Usage:');
  });
});

// ─── 02-glass-card: IosGlassCard fill/stroke/prop ───────────────────────────────

describe('02-glass-card FR1: IosGlassCard fill opacity 75%', () => {
  let glassCardSrc: string;

  beforeAll(() => {
    const src = readIosWidget();
    // Extract IosGlassCard function body
    const start = src.indexOf('function IosGlassCard(');
    const end = src.indexOf('\n// ', start);
    glassCardSrc = src.slice(start, end);
  });

  it('SC1.1: IosGlassCard RoundedRectangle fill is #1C1E26BF (75% opacity)', () => {
    expect(glassCardSrc).toContain('fill="#1C1E26BF"');
  });

  it('SC1.2: IosGlassCard RoundedRectangle fill is NOT #1C1E26CC (old 80% value)', () => {
    expect(glassCardSrc).not.toContain('#1C1E26CC');
  });
});

describe('02-glass-card FR2: IosGlassCard specular edge 15% white', () => {
  let glassCardSrc: string;

  beforeAll(() => {
    const src = readIosWidget();
    const start = src.indexOf('function IosGlassCard(');
    const end = src.indexOf('\n// ', start);
    glassCardSrc = src.slice(start, end);
  });

  it('SC2.1: IosGlassCard stroke is #FFFFFF26 (15% white)', () => {
    expect(glassCardSrc).toContain('stroke="#FFFFFF26"');
  });

  it('SC2.2: IosGlassCard stroke is NOT #FFFFFF1A (old 10% value)', () => {
    expect(glassCardSrc).not.toContain('#FFFFFF1A');
  });

  it('SC2.3: IosGlassCard strokeWidth is 0.5', () => {
    expect(glassCardSrc).toContain('strokeWidth={0.5}');
  });
});

describe('02-glass-card FR3: borderColor prop removed', () => {
  let glassCardSrc: string;
  let fullSrc: string;

  beforeAll(() => {
    fullSrc = readIosWidget();
    const start = fullSrc.indexOf('function IosGlassCard(');
    const end = fullSrc.indexOf('\n// ', start);
    glassCardSrc = fullSrc.slice(start, end);
  });

  it('SC3.1: IosGlassCard function signature does not include borderColor parameter', () => {
    // The signature block (up to first `{`) must not contain borderColor
    const signatureEnd = glassCardSrc.indexOf(') {');
    const signature = glassCardSrc.slice(0, signatureEnd);
    expect(signature).not.toContain('borderColor');
  });

  it('SC3.2: IosGlassCard body does not reference borderColor', () => {
    expect(glassCardSrc).not.toContain('borderColor');
  });

  it('SC3.3: No IosGlassCard caller passes borderColor prop', () => {
    // Search entire file for IosGlassCard usage with borderColor prop
    expect(fullSrc).not.toMatch(/IosGlassCard borderColor=/);
    expect(fullSrc).not.toMatch(/<IosGlassCard[^>]*borderColor/);
  });
});
