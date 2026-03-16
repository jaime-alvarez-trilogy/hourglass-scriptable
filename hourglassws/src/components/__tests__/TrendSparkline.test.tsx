// Tests: TrendSparkline — 02-watermarks FR3
//
// FR3: TrendSparkline cap label
//   SC3.1 — capLabel prop in TrendSparklineProps interface
//   SC3.2 — when showGuide && capLabel, Skia Text rendered in source
//   SC3.3 — cap label opacity <= 0.40
//   SC3.4 — cap label x near right edge (width - padding)
//   SC3.5 — capLabel without showGuide: no label rendered
//   SC3.6 — capLabel undefined: no crash, no label
//
// Strategy:
// - Source-level static analysis for interface and positioning details
// - react-test-renderer for crash/no-crash validation
// - Skia mock from __mocks__/@shopify/react-native-skia.ts

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as path from 'path';
import * as fs from 'fs';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-web/dist/exports/View/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      R.createElement('View', { testID, style, ...rest }, children),
  };
});

jest.mock('react-native-web/dist/exports/Text/index.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style, ...rest }: any) =>
      R.createElement('Text', { testID, style, ...rest }, children),
  };
});

// ─── File paths ───────────────────────────────────────────────────────────────

const HOURGLASSWS_ROOT = path.resolve(__dirname, '../../..');
const SPARKLINE_FILE = path.join(HOURGLASSWS_ROOT, 'src', 'components', 'TrendSparkline.tsx');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DATA = [1200, 1350, 1100, 1500, 1400, 1600, 1450, 1550];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSparkline(props: {
  data?: number[];
  width?: number;
  height?: number;
  maxValue?: number;
  showGuide?: boolean;
  capLabel?: string;
}) {
  const TrendSparkline = require('@/src/components/TrendSparkline').default;
  const defaultProps = {
    data: MOCK_DATA,
    width: 300,
    height: 60,
    ...props,
  };
  let tree: any;
  act(() => {
    tree = create(React.createElement(TrendSparkline, defaultProps));
  });
  return tree;
}

// ─── FR1 (07-chart-line-polish): TrendSparkline line glow ────────────────────
//
// SC1.1 — BlurMaskFilter imported from @shopify/react-native-skia
// SC1.2 — Data line Path has strokeWidth 2.5
// SC1.3 — Data line Path has a child Paint with BlurMaskFilter child
// SC1.4 — Glow Paint BlurMaskFilter blur >= 6
// SC1.5 — Glow Paint strokeWidth > line strokeWidth
// SC1.6 — Glow Paint color = lineColor + '40' alpha suffix
// SC1.7 — Guide line (showGuide=true) has no BlurMaskFilter child
// SC1.8 — Empty data renders without crash
// SC1.9 — width=0 renders without crash (returns null before canvas)
// SC1.10 — Scrub gesture (externalCursorIndex) unaffected by render changes

describe('TrendSparkline — FR1 (07-chart-line-polish): Line Glow', () => {
  it('SC1.1 — BlurMaskFilter is imported from @shopify/react-native-skia', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/BlurMaskFilter/);
    expect(source).toMatch(/@shopify\/react-native-skia/);
    // Both in same import statement
    expect(source).toMatch(/BlurMaskFilter[\s\S]{0,200}@shopify\/react-native-skia|@shopify\/react-native-skia[\s\S]{0,200}BlurMaskFilter/);
  });

  it('SC1.2 — data line Path has strokeWidth 2.5 (hardcoded or as default prop)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // strokeWidth={2.5} on the main line Path, or strokeWidth = 2.5 as default
    expect(source).toMatch(/strokeWidth[=\s:]*\{?2\.5\}?|strokeWidth\s*=\s*2\.5/);
  });

  it('SC1.3 — source contains a BlurMaskFilter element inside a Paint child of the data line', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Paint wrapping a BlurMaskFilter
    expect(source).toMatch(/<Paint[\s\S]{0,300}<BlurMaskFilter/);
  });

  it('SC1.4 — BlurMaskFilter blur value is >= 6', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // blur={8} or blur={6} or higher
    const match = source.match(/BlurMaskFilter[\s\S]{0,100}blur=\{(\d+(?:\.\d+)?)\}/);
    expect(match).not.toBeNull();
    const blurVal = parseFloat(match![1]);
    expect(blurVal).toBeGreaterThanOrEqual(6);
  });

  it('SC1.5 — glow Paint strokeWidth is greater than the line strokeWidth (2.5)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // The Paint child should have a strokeWidth > 2.5 (e.g. 10)
    // Look for Paint with large strokeWidth near BlurMaskFilter
    const match = source.match(/<Paint[\s\S]{0,200}strokeWidth=\{(\d+(?:\.\d+)?)\}[\s\S]{0,200}<BlurMaskFilter/);
    if (match) {
      const paintStrokeWidth = parseFloat(match[1]);
      expect(paintStrokeWidth).toBeGreaterThan(2.5);
    } else {
      // Also accept strokeWidth before BlurMaskFilter within Paint block
      const match2 = source.match(/strokeWidth=\{(\d+(?:\.\d+)?)\}[\s\S]{0,100}<BlurMaskFilter/);
      expect(match2).not.toBeNull();
      const paintStrokeWidth = parseFloat(match2![1]);
      expect(paintStrokeWidth).toBeGreaterThan(2.5);
    }
  });

  it('SC1.6 — glow Paint color uses lineColor/color prop with alpha suffix', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Pattern: color={lineColor + '40'} or color={color + '40'}
    expect(source).toMatch(/color=\{(?:lineColor|color)\s*\+\s*'[0-9a-fA-F]{2}'\}/);
  });

  it('SC1.7 — guide line (Line element) does NOT have a BlurMaskFilter child', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // The <Line> elements should not contain BlurMaskFilter
    // Verify: no <Line ... <BlurMaskFilter> pattern
    expect(source).not.toMatch(/<Line[\s\S]{0,300}<BlurMaskFilter/);
  });

  it('SC1.8 — empty data renders without crash', () => {
    expect(() =>
      renderSparkline({ data: [], width: 300, height: 60 }),
    ).not.toThrow();
  });

  it('SC1.9 — width=0 renders without crash (returns null before canvas)', () => {
    expect(() =>
      renderSparkline({ data: MOCK_DATA, width: 0, height: 60 }),
    ).not.toThrow();
  });

  it('SC1.10 — externalCursorIndex prop still accepted and renders without crash', () => {
    const TrendSparkline = require('@/src/components/TrendSparkline').default;
    expect(() => {
      let tree: any;
      act(() => {
        tree = create(React.createElement(TrendSparkline, {
          data: MOCK_DATA,
          width: 300,
          height: 60,
          externalCursorIndex: 3,
        }));
      });
    }).not.toThrow();
  });
});

// ─── FR3: TrendSparkline cap label ───────────────────────────────────────────

describe('TrendSparkline — FR3: Cap Label', () => {
  it('SC3.1 — TrendSparklineProps includes capLabel?: string', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/capLabel\s*\?\s*:\s*string/);
  });

  it('SC3.2 — source imports matchFont and Text from @shopify/react-native-skia', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toContain('matchFont');
    expect(source).toMatch(/Text.*@shopify\/react-native-skia|@shopify\/react-native-skia[\s\S]{0,200}Text/);
  });

  it('SC3.3 — when showGuide && capLabel provided, source contains Skia Text with capLabel', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Source should render a Skia <Text ... text={capLabel}> guarded by showGuide && capLabel
    expect(source).toMatch(/<Text[\s\S]{0,300}capLabel/);
  });

  it('SC3.4 — cap label opacity <= 0.40', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Opacity should be <= 0.40 near the capLabel rendering
    expect(source).toMatch(/capLabel[\s\S]{0,600}opacity=\{0\.[0-3][0-9]*/);
  });

  it('SC3.5 — cap label x position derived from width minus padding (right-aligned)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Right edge: width - something
    expect(source).toMatch(/width\s*-\s*\w*[Ww]idth|\bwidth\s*-\s*\d/);
  });

  it('SC3.6 — cap label is guarded by showGuide && capLabel', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    expect(source).toMatch(/showGuide\s*&&\s*capLabel/);
  });

  it('SC3.7 — cap label font size is 10sp (matching AIConeChart axis label pattern)', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Either literal `fontSize: 10` or a constant `CAP_LABEL_FONT_SIZE = 10` with `fontSize: CAP_LABEL_FONT_SIZE`
    const hasLiteralFontSize = /fontSize\s*:\s*10/.test(source);
    const hasConstantTen = /CAP_LABEL_FONT_SIZE\s*=\s*10/.test(source);
    expect(hasLiteralFontSize || hasConstantTen).toBe(true);
  });

  it('SC3.8 — capLabel without showGuide: component renders without crash', () => {
    expect(() =>
      renderSparkline({ capLabel: '$2,000', showGuide: false, maxValue: 2000 }),
    ).not.toThrow();
  });

  it('SC3.9 — capLabel undefined: component renders without crash', () => {
    expect(() =>
      renderSparkline({ showGuide: true, maxValue: 2000 }),
    ).not.toThrow();
  });

  it('SC3.10 — showGuide && capLabel provided: component renders without crash', () => {
    expect(() =>
      renderSparkline({ capLabel: '$2,000', showGuide: true, maxValue: 2000, width: 300, height: 60 }),
    ).not.toThrow();
  });

  it('SC3.11 — guard also checks font is non-null before rendering Skia Text', () => {
    const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');
    // Guard: showGuide && capLabel && font (or capFont)
    expect(source).toMatch(/showGuide\s*&&\s*capLabel\s*&&\s*\w*[Ff]ont/);
  });
});

// ─── FR1 + FR2 (04-chart-polish): TrendSparkline 3px + 3-layer glow ──────────
//
// FR1:
//   SC-FR1.1 — strokeWidth prop defaults to 3 (not 2)
//   SC-FR1.2 — explicit strokeWidth prop still accepted
//
// FR2:
//   SC-FR2.1 — outer glow Paint has strokeWidth={14}
//   SC-FR2.2 — outer glow BlurMask has blur={12}
//   SC-FR2.3 — mid glow Paint exists with strokeWidth={7}
//   SC-FR2.4 — mid glow BlurMask has blur={4}
//   SC-FR2.5 — mid glow uses color + '80' (50% opacity variant)
//   SC-FR2.6 — core line has no BlurMask child
//   SC-FR2.7 — render with default strokeWidth does not crash

describe('TrendSparkline — FR1+FR2 (04-chart-polish): 3px + 3-layer glow', () => {
  const source = fs.readFileSync(SPARKLINE_FILE, 'utf8');

  it('SC-FR1.1 — strokeWidth prop defaults to 3 (not 2)', () => {
    // Default value in function signature: strokeWidth = 3
    expect(source).toMatch(/strokeWidth\s*=\s*3[^.0-9]/);
  });

  it('SC-FR1.2 — explicit strokeWidth prop still accepted without crash', () => {
    const TrendSparkline = require('@/src/components/TrendSparkline').default;
    expect(() => {
      let tree: any;
      act(() => {
        tree = create(React.createElement(TrendSparkline, {
          data: MOCK_DATA,
          width: 300,
          height: 60,
          strokeWidth: 2,
        }));
      });
    }).not.toThrow();
  });

  it('SC-FR2.1 — outer glow Paint has strokeWidth={14}', () => {
    // Outer glow Paint (first Paint layer, wrapping BlurMask blur=12)
    expect(source).toMatch(/strokeWidth=\{14\}/);
  });

  it('SC-FR2.2 — outer glow BlurMask has blur={12}', () => {
    // BlurMask with blur=12 (was 8)
    expect(source).toMatch(/BlurMask\s[^>]*blur=\{12\}/);
  });

  it('SC-FR2.3 — mid glow Paint exists with strokeWidth={7}', () => {
    // Mid glow is the new layer
    expect(source).toMatch(/strokeWidth=\{7\}/);
  });

  it('SC-FR2.4 — mid glow BlurMask has blur={4}', () => {
    // BlurMask with blur=4 (new mid-glow layer)
    expect(source).toMatch(/BlurMask\s[^>]*blur=\{4\}/);
  });

  it('SC-FR2.5 — mid glow uses color + "80" (50% opacity)', () => {
    // color + '80' alpha suffix on the mid glow layer
    expect(source).toMatch(/color\s*\+\s*'80'/);
  });

  it('SC-FR2.6 — source has at least 2 distinct Paint layers with BlurMask (outer + mid)', () => {
    // Count occurrences of BlurMask — should be >= 2 (outer glow + mid glow)
    const blurMaskCount = (source.match(/BlurMask/g) || []).length;
    expect(blurMaskCount).toBeGreaterThanOrEqual(2);
  });

  it('SC-FR2.7 — renders without crash with default strokeWidth', () => {
    expect(() =>
      renderSparkline({ data: MOCK_DATA, width: 300, height: 60 }),
    ).not.toThrow();
  });
});
