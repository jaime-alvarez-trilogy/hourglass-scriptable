// Tests: Tab layout (_layout.tsx) — FR1 (02-approvals-tab-redesign)
// Verifies always-visible Requests tab with no role gate.
//
// Strategy:
//   - Source-file static analysis: confirms tab title, showApprovals removal
//   - Runtime render tests: tab renders for all config states
//
// NOTE on NativeWind v4: className is hashed in Jest — use source-file static
// analysis for className assertions.

import React from 'react';
import { create, act } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mock setup ───────────────────────────────────────────────────────────────

jest.mock('@/src/hooks/useConfig');

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    Tabs: Object.assign(
      ({ children }: any) => mockReact.createElement(mockReact.Fragment, null, children),
      {
        Screen: ({ name, options }: any) =>
          mockReact.createElement('View', { testID: `tab-${name}`, ...options }),
      }
    ),
  };
});

jest.mock('@/components/haptic-tab', () => ({
  HapticTab: ({ children }: any) => {
    const mockReact = require('react');
    return mockReact.createElement('View', null, children);
  },
}));

jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

// ─── Typed mock imports ───────────────────────────────────────────────────────

import { useConfig } from '@/src/hooks/useConfig';

// ─── File path ────────────────────────────────────────────────────────────────

const LAYOUT_FILE = path.resolve(__dirname, '../_layout.tsx');

// ─── Source file static checks (FR1) ─────────────────────────────────────────

describe('TabLayout — FR1: source file static checks', () => {
  let source: string;
  let code: string;

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  // SC1.4 — Tab title is "Requests"
  it('SC1.4 — source contains title "Requests"', () => {
    expect(source).toContain('"Requests"');
  });

  it('SC1.4 — source does NOT contain title "Approvals" for the tab', () => {
    // "Approvals" must not appear as a tab title string
    // (comments may still mention it — we check the non-comment code)
    expect(code).not.toContain('"Approvals"');
  });

  // SC1.5 — showApprovals variable removed
  it('SC1.5 — source does not declare showApprovals variable', () => {
    expect(code).not.toContain('showApprovals');
  });

  it('SC1.5 — source does not conditionally hide tab with tabBarButton null', () => {
    // The conditional `() => null` pattern used to gate tab visibility must be gone
    expect(code).not.toMatch(/tabBarButton\s*:\s*showApprovals/);
  });

  it('SC1.5 — source does not return null tab button', () => {
    // Matches `() => null` as a tabBarButton value pattern
    expect(code).not.toMatch(/tabBarButton\s*:.*\(\s*\)\s*=>\s*null/);
  });
});

// ─── Runtime render checks (FR1) ─────────────────────────────────────────────

describe('TabLayout — FR1: renders for contributor (SC1.1)', () => {
  beforeEach(() => {
    (useConfig as jest.Mock).mockReturnValue({
      config: { isManager: false },
      isLoading: false,
    });
    jest.resetModules();
  });

  it('SC1.1 — renders without crash for contributor config', () => {
    const TabLayout = require('../_layout').default;
    expect(() => {
      act(() => { create(React.createElement(TabLayout)); });
    }).not.toThrow();
  });
});

describe('TabLayout — FR1: renders for manager (SC1.2)', () => {
  beforeEach(() => {
    (useConfig as jest.Mock).mockReturnValue({
      config: { isManager: true },
      isLoading: false,
    });
    jest.resetModules();
  });

  it('SC1.2 — renders without crash for manager config', () => {
    const TabLayout = require('../_layout').default;
    expect(() => {
      act(() => { create(React.createElement(TabLayout)); });
    }).not.toThrow();
  });
});

describe('TabLayout — FR1: renders when config is null (SC1.3)', () => {
  beforeEach(() => {
    (useConfig as jest.Mock).mockReturnValue({
      config: null,
      isLoading: true,
    });
    jest.resetModules();
  });

  it('SC1.3 — renders without crash when config is null', () => {
    const TabLayout = require('../_layout').default;
    expect(() => {
      act(() => { create(React.createElement(TabLayout)); });
    }).not.toThrow();
  });
});
