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
    expect(source).toMatch(/fontSize\s*:\s*10/);
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
