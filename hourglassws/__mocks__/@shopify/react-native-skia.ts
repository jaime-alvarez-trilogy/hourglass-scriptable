// Mock for @shopify/react-native-skia — Jest/node environment
// Canvas passes through children so React tree is renderable in tests.
// All drawing primitives (Rect, Path, Circle, Line) return null — no canvas output in Jest.
// useDerivedValue is mocked to synchronously return { value: fn() } for test predictability.

const React = require('react');

module.exports = {
  Canvas: ({ children, width, height, style }: any) =>
    React.createElement('Canvas', { width, height, style }, children),

  Rect: (_props: any) => null,
  Path: (_props: any) => null,
  Circle: (_props: any) => null,
  Line: (_props: any) => null,
  Text: (_props: any) => null,
  Group: ({ children }: any) => children ?? null,
  Paint: (_props: any) => null,
  Fill: (_props: any) => null,
  RoundedRect: (_props: any) => null,

  // matchFont — returns a mock font object (non-null) for test predictability
  matchFont: jest.fn((_descriptor: any) => ({ size: 10 })),

  // Reanimated-Skia bridge — synchronous in test environment
  useDerivedValue: (fn: () => any) => ({ value: fn() }),
  useSharedValueEffect: (_effect: any, ..._deps: any[]) => {},

  Skia: {
    Path: () => ({
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      cubicTo: jest.fn().mockReturnThis(),
      quadTo: jest.fn().mockReturnThis(),
      addArc: jest.fn().mockReturnThis(),
      arcTo: jest.fn().mockReturnThis(),
      close: jest.fn().mockReturnThis(),
      copy: jest.fn().mockReturnThis(),
      reset: jest.fn().mockReturnThis(),
    }),
    XYWHRect: jest.fn((x: number, y: number, w: number, h: number) => ({ x, y, w, h })),
    Color: jest.fn((color: string) => color),
  },
};
