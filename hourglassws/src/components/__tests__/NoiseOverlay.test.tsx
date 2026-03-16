// Tests: NoiseOverlay component (05-panel-glass-surfaces)
// FR4: Noise texture overlay — absolutely positioned, opacity 0.04, pointerEvents none
//
// Mock strategy:
// - Image asset: require() returns numeric asset ID — mock as 1
// - Image component: rendered via react-test-renderer

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// Mock the noise image asset so require() doesn't fail in test environment
jest.mock('../../../assets/images/noise.png', () => 1, { virtual: true });

const NOISE_OVERLAY_FILE = path.resolve(__dirname, '../NoiseOverlay.tsx');

describe('NoiseOverlay — FR4: component render', () => {
  let NoiseOverlay: any;

  beforeAll(() => {
    jest.resetModules();
    // Re-register virtual asset mock after resetModules
    jest.mock('../../../assets/images/noise.png', () => 1, { virtual: true });
    NoiseOverlay = require('../NoiseOverlay').default;
  });

  it('FR4.1 — renders without error', () => {
    expect(() => {
      act(() => {
        create(React.createElement(NoiseOverlay));
      });
    }).not.toThrow();
  });

  it('FR4.2 — root element has pointerEvents="none"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NoiseOverlay));
    });
    const json = tree.toJSON();
    // pointerEvents is a prop on the root View
    expect(json).not.toBeNull();
    expect(json.props.pointerEvents).toBe('none');
  });

  it('FR4.3 — Image has opacity 0.04', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NoiseOverlay));
    });
    // Find Image node — it may be nested
    const findImage = (node: any): any => {
      if (!node) return null;
      if (node.type === 'Image') return node;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findImage(child);
          if (found) return found;
        }
      }
      return null;
    };
    const imageNode = findImage(tree.toJSON());
    expect(imageNode).not.toBeNull();
    const opacity = imageNode?.props?.style?.opacity ?? imageNode?.props?.style?.[0]?.opacity;
    expect(opacity).toBeCloseTo(0.04, 5);
  });

  it('FR4.4 — Image is absolutely positioned', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NoiseOverlay));
    });
    const findImage = (node: any): any => {
      if (!node) return null;
      if (node.type === 'Image') return node;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findImage(child);
          if (found) return found;
        }
      }
      return null;
    };
    const imageNode = findImage(tree.toJSON());
    expect(imageNode).not.toBeNull();
    const style = imageNode?.props?.style ?? {};
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.position).toBe('absolute');
  });

  it('FR4.5 — Image has resizeMode="repeat"', () => {
    let tree: any;
    act(() => {
      tree = create(React.createElement(NoiseOverlay));
    });
    const findImage = (node: any): any => {
      if (!node) return null;
      if (node.type === 'Image') return node;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findImage(child);
          if (found) return found;
        }
      }
      return null;
    };
    const imageNode = findImage(tree.toJSON());
    expect(imageNode).not.toBeNull();
    expect(imageNode?.props?.resizeMode).toBe('repeat');
  });
});

// ─── Source file checks ────────────────────────────────────────────────────────

describe('NoiseOverlay — FR4: source file structure', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(NOISE_OVERLAY_FILE, 'utf8');
  });

  it('FR4.6 — source imports Image from react-native', () => {
    expect(source).toContain('Image');
  });

  it('FR4.7 — source references noise.png asset', () => {
    expect(source).toContain('noise.png');
  });

  it('FR4.8 — source uses pointerEvents="none"', () => {
    expect(source).toContain('pointerEvents');
    expect(source).toContain('none');
  });

  it('FR4.9 — source uses opacity: 0.04', () => {
    expect(source).toContain('0.04');
  });

  it('FR4.10 — source uses position: absolute', () => {
    expect(source).toContain('absolute');
  });

  it('FR4.11 — source uses resizeMode="repeat"', () => {
    expect(source).toContain('repeat');
  });
});
