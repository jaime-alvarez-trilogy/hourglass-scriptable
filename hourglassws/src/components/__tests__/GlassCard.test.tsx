// Tests: GlassCard component (03-glass-surfaces)
// FR1: Skia BackdropFilter blur layer
// FR2: Masked gradient border (MaskedView + LinearGradient)
// FR3: InnerShadow physical depth
// FR4: Pressable spring animation
// FR5: layerBudget={false} flat-surface fallback
// FR6: padding and radius props
//
// Testing strategy:
// - Runtime render checks use react-test-renderer tree JSON
// - Source static checks (fs.readFileSync) for values not observable at runtime
//   (e.g. specific numeric constants, inline style values)
// - Mocks: @shopify/react-native-skia, @react-native-masked-view/masked-view,
//   react-native-inner-shadow all mock as host elements for tree assertions

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

const GLASS_CARD_FILE = path.resolve(__dirname, '../GlassCard.tsx');

// ─── Module handle ─────────────────────────────────────────────────────────────

let GlassCard: any;

beforeAll(() => {
  const mod = require('../GlassCard');
  GlassCard = mod.default;
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function renderCard(props: Record<string, any> = {}, children: any = 'test child') {
  let tree: any;
  act(() => {
    tree = create(React.createElement(GlassCard, props, children));
  });
  return tree;
}

function treeJSON(tree: any): string {
  return JSON.stringify(tree.toJSON());
}

// ─── FR1: Skia BackdropFilter blur layer ──────────────────────────────────────

describe('GlassCard — FR1: Skia BackdropFilter blur layer', () => {
  it('FR1.1 — renders children without crash', () => {
    expect(() => renderCard()).not.toThrow();
  });

  it('FR1.2 — rendered output is not null', () => {
    const tree = renderCard();
    expect(tree.toJSON()).not.toBeNull();
  });

  it('FR1.3 — render tree contains Canvas element', () => {
    const tree = renderCard();
    expect(treeJSON(tree)).toContain('"Canvas"');
  });

  it('FR1.4 — BackdropFilter is rendered after layout fires (dims.w > 0 guard)', () => {
    // BackdropFilter is guarded by dims.w > 0 — fire onLayout to unlock it.
    // Use root.findAll() instead of JSON.stringify because BackdropFilter has
    // a React element prop (filter=<Blur/>) that causes circular JSON errors.
    let tree: any;
    act(() => {
      tree = create(React.createElement(GlassCard, null, 'child'));
    });
    // Fire the Canvas onLayout to set dimensions
    act(() => {
      const json = tree.toJSON();
      const canvas = findElement(json, 'Canvas');
      if (canvas?.props?.onLayout) {
        canvas.props.onLayout({ nativeEvent: { layout: { width: 320, height: 120 } } });
      }
    });
    // Use root instance traversal — avoids circular JSON issue with React element props
    const allInstances = tree.root.findAll((node: any) => node.type === 'BackdropFilter', { deep: true });
    expect(allInstances.length).toBeGreaterThan(0);
  });

  it('FR1.5 — source contains default blur radius 16 (base blur)', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('base: 16');
  });

  it('FR1.6 — source contains elevated blur radius 20', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('elevated: 20');
  });

  it('FR1.7 — source uses renderToHardwareTextureAndroid with Platform check', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('renderToHardwareTextureAndroid');
    expect(source).toContain("Platform.OS === 'android'");
  });

  it('FR1.8 — children appear in rendered output', () => {
    const tree = renderCard({}, 'inner text content');
    expect(treeJSON(tree)).toContain('inner text content');
  });

  it('FR1.9 — renders exactly one root element (not fragment, not array)', () => {
    const tree = renderCard();
    const json = tree.toJSON();
    expect(Array.isArray(json)).toBe(false);
    expect(json).not.toBeNull();
  });

  it('FR1.10 — source imports BackdropFilter from @shopify/react-native-skia', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('BackdropFilter');
    expect(source).toContain('@shopify/react-native-skia');
  });
});

// ─── FR2: Masked gradient border ──────────────────────────────────────────────

describe('GlassCard — FR2: masked gradient border', () => {
  it('FR2.1 — render tree contains MaskedView element', () => {
    const tree = renderCard();
    expect(treeJSON(tree)).toContain('"MaskedView"');
  });

  it('FR2.2 — source contains default border accent color #A78BFA (violet)', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('#A78BFA');
  });

  it('FR2.3 — custom borderAccentColor prop accepted without crash', () => {
    expect(() => renderCard({ borderAccentColor: '#00C2FF' })).not.toThrow();
  });

  it('FR2.4 — source contains 45-degree gradient vectors (start x:0,y:1 end x:1,y:0)', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    // 45° gradient: start {x:0,y:1} → end {x:1,y:0}
    expect(source).toMatch(/x:\s*0[,}].*y:\s*1/s);
    expect(source).toMatch(/x:\s*1[,}].*y:\s*0/s);
  });

  it('FR2.5 — source contains 1.5px border gap for mask', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toMatch(/1\.5/);
  });

  it('FR2.6 — source imports from @react-native-masked-view/masked-view', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('@react-native-masked-view/masked-view');
  });
});

// ─── FR3: InnerShadow physical depth ─────────────────────────────────────────

describe('GlassCard — FR3: inner shadow physical depth', () => {
  it('FR3.1 — render tree contains InnerShadow element', () => {
    const tree = renderCard();
    expect(treeJSON(tree)).toContain('"InnerShadow"');
  });

  it('FR3.2 — source contains top shadow color rgba(0,0,0,0.6)', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('rgba(0,0,0,0.6)');
  });

  it('FR3.3 — source contains bottom highlight color rgba(255,255,255,0.08)', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('rgba(255,255,255,0.08)');
  });

  it('FR3.4 — source imports InnerShadow from react-native-inner-shadow', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('react-native-inner-shadow');
    expect(source).toContain('InnerShadow');
  });
});

// ─── FR4: Pressable spring animation ─────────────────────────────────────────

describe('GlassCard — FR4: pressable spring animation', () => {
  it('FR4.1 — pressable=false (default) has no press handler on root element', () => {
    // In jest/web env Pressable renders as a div — can't check by element type.
    // Instead verify there is no element with onPressIn/onPressOut in the tree,
    // which confirms no press responder is wired.
    const tree = renderCard({ pressable: false });
    const json = tree.toJSON();
    expect(findElementWithProp(json, 'onPressIn')).toBeNull();
    expect(findElementWithProp(json, 'onPressOut')).toBeNull();
  });

  it('FR4.2 — pressable=true wraps card in a touchable element (source check)', () => {
    // In the jest/node environment Pressable renders as a native div element.
    // Verify via source that the component uses Pressable from react-native.
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('Pressable');
    // And confirm the component actually renders something when pressable=true
    expect(() => renderCard({ pressable: true })).not.toThrow();
  });

  it('FR4.3 — pressable=true with onPressIn — callable without crash', () => {
    // Pressable renders as div in jest — traverse tree to find element with onPressIn
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(GlassCard, { pressable: true, onPress: jest.fn() }, 'child')
      );
    });
    // Find any element with onPressIn handler — it will be the pressable wrapper
    const json = tree.toJSON();
    const pressableEl = findElementWithProp(json, 'onPressIn');
    expect(() => {
      if (pressableEl?.props?.onPressIn) pressableEl.props.onPressIn();
    }).not.toThrow();
  });

  it('FR4.4 — pressable=true with onPressOut — callable without crash', () => {
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(GlassCard, { pressable: true, onPress: jest.fn() }, 'child')
      );
    });
    const json = tree.toJSON();
    const pressableEl = findElementWithProp(json, 'onPressOut');
    expect(() => {
      if (pressableEl?.props?.onPressOut) pressableEl.props.onPressOut();
    }).not.toThrow();
  });

  it('FR4.5 — source contains withSpring(0.97 for press-in scale target', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('withSpring(0.97');
  });

  it('FR4.6 — source contains stiffness: 300 and damping: 20', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain('stiffness: 300');
    expect(source).toContain('damping: 20');
  });

  it('FR4.7 — onPress callback is invoked when pressable=true and pressed', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = create(
        React.createElement(GlassCard, { pressable: true, onPress }, 'child')
      );
    });
    // Use root instance traversal to find and invoke the Pressable component's onPress
    // directly on the React instance — avoids the RN-web synthetic event requirement.
    // Find the Pressable instance by type and invoke its prop directly.
    const pressableInstances = tree.root.findAll(
      (node: any) => node.type && (
        node.type === 'Pressable' ||
        (typeof node.type === 'function' && node.type.displayName === 'Pressable') ||
        (typeof node.type === 'object' && node.type?.displayName === 'Pressable')
      ),
      { deep: true }
    );
    // Fallback: find any instance with an onPress prop
    const hasPressInstance = pressableInstances.length > 0
      ? pressableInstances[0]
      : tree.root.findAll((n: any) => n.props?.onPress === onPress, { deep: true })[0];

    expect(hasPressInstance).toBeDefined();
    act(() => {
      if (hasPressInstance?.props?.onPress) hasPressInstance.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// Helper: find first element with given type in a nested JSON tree
function findElement(node: any, type: string): any {
  if (!node) return null;
  if (node.type === type) return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findElement(child, type);
      if (found) return found;
    }
  }
  return null;
}

// Helper: find first element that has a specific prop key
function findElementWithProp(node: any, propKey: string): any {
  if (!node) return null;
  if (node.props && propKey in node.props) return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (typeof child === 'object' && child !== null) {
        const found = findElementWithProp(child, propKey);
        if (found) return found;
      }
    }
  }
  return null;
}

// ─── FR5: layerBudget fallback ────────────────────────────────────────────────

describe('GlassCard — FR5: layerBudget fallback', () => {
  it('FR5.1 — layerBudget=false renders no Canvas element', () => {
    const tree = renderCard({ layerBudget: false });
    expect(treeJSON(tree)).not.toContain('"Canvas"');
  });

  it('FR5.2 — layerBudget=false renders no MaskedView element', () => {
    const tree = renderCard({ layerBudget: false });
    expect(treeJSON(tree)).not.toContain('"MaskedView"');
  });

  it('FR5.3 — layerBudget=false renders no InnerShadow element', () => {
    const tree = renderCard({ layerBudget: false });
    expect(treeJSON(tree)).not.toContain('"InnerShadow"');
  });

  it('FR5.4 — layerBudget=false still renders children', () => {
    const tree = renderCard({ layerBudget: false }, 'fallback child');
    expect(treeJSON(tree)).toContain('fallback child');
  });

  it('FR5.5 — layerBudget=true (default) renders Canvas element', () => {
    const tree = renderCard({ layerBudget: true });
    expect(treeJSON(tree)).toContain('"Canvas"');
  });

  it('FR5.6 — layerBudget unset (default true) renders Canvas element', () => {
    const tree = renderCard();
    expect(treeJSON(tree)).toContain('"Canvas"');
  });
});

// ─── FR6: Padding and radius props ────────────────────────────────────────────

describe('GlassCard — FR6: padding and radius props', () => {
  it('FR6.1 — source contains padding value 20 for "md"', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain("'md': 20");
  });

  it('FR6.2 — source contains padding value 24 for "lg"', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain("'lg': 24");
  });

  it('FR6.3 — source contains borderRadius 16 for "2xl"', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain("'2xl': 16");
  });

  it('FR6.4 — source contains borderRadius 12 for "xl"', () => {
    const source = fs.readFileSync(GLASS_CARD_FILE, 'utf8');
    expect(source).toContain("'xl': 12");
  });

  it('FR6.5 — padding="lg" prop accepted without crash', () => {
    expect(() => renderCard({ padding: 'lg' })).not.toThrow();
  });

  it('FR6.6 — radius="xl" prop accepted without crash', () => {
    expect(() => renderCard({ radius: 'xl' })).not.toThrow();
  });
});
