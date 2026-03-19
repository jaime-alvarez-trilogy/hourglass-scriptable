// Tests: app/(tabs)/_layout.tsx — 06-native-tabs spec
//
// FR1: Feature flags in app.json (ENABLE_NATIVE_TABS, ENABLE_SHARED_ELEMENT_TRANSITIONS)
// FR2: Feature flag read in _layout.tsx (Constants.expoConfig.extra)
// FR3: TAB_SCREENS shared constant
// FR4: NativeTabs navigator render path
// FR5: Legacy Tabs fallback path (HapticTab removal)
// FR6: AmbientBackground / NoiseOverlay layout unchanged
//
// Test strategy:
//   - FR1: JSON parse app.json and verify extra block
//   - FR2-FR6: Source-file static analysis (fs.readFileSync)
//     This matches the established pattern in tabs-layout.test.tsx and layout.test.tsx.
//     Runtime render tests for the tab layout are not viable in jest-expo/node due to
//     react-native-web ThemeContext conflicts with react-test-renderer.

import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ───────────────────────────────────────────────────────────────

const LAYOUT_FILE = path.resolve(__dirname, '../_layout.tsx');
const APP_JSON_FILE = path.resolve(__dirname, '../../../app.json');

// ─── FR1: Feature flags in app.json ──────────────────────────────────────────

describe('06-native-tabs — FR1: feature flags in app.json', () => {
  let extra: Record<string, unknown>;

  beforeAll(() => {
    const raw = fs.readFileSync(APP_JSON_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    extra = parsed.expo?.extra ?? {};
  });

  it('SC1.1 — app.json expo.extra contains ENABLE_NATIVE_TABS: true', () => {
    expect(extra).toHaveProperty('ENABLE_NATIVE_TABS', true);
  });

  it('SC1.2 — app.json expo.extra contains ENABLE_SHARED_ELEMENT_TRANSITIONS: true', () => {
    expect(extra).toHaveProperty('ENABLE_SHARED_ELEMENT_TRANSITIONS', true);
  });

  it('SC1.3 — existing router key inside extra is preserved', () => {
    expect(extra).toHaveProperty('router');
  });

  it('SC1.3 — existing eas key inside extra is preserved', () => {
    expect(extra).toHaveProperty('eas');
    expect((extra.eas as any)?.projectId).toBe('4ad8a6bd-aec2-45a5-935f-5598d47b605d');
  });
});

// ─── FR2: Feature flag read in _layout.tsx ───────────────────────────────────

describe('06-native-tabs — FR2: feature flag read in _layout.tsx', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
  });

  it('SC2.4 — source imports Constants from expo-constants', () => {
    expect(source).toMatch(/import\s+Constants\s+from\s+['"]expo-constants['"]/);
  });

  it('SC2.1 / SC2.2 — source reads ENABLE_NATIVE_TABS from Constants.expoConfig.extra', () => {
    // The flag read must use optional chaining for safety
    expect(source).toContain('ENABLE_NATIVE_TABS');
    expect(source).toContain('Constants.expoConfig');
  });

  it('SC2.3 — flag read uses ?? false as safe default', () => {
    // When flag is absent, layout falls back to legacy Tabs
    expect(source).toMatch(/ENABLE_NATIVE_TABS.*\?\?\s*false/);
  });

  it('SC2.1 — source imports NativeTabs from expo-router/unstable-native-tabs', () => {
    // NativeTabs path must be present for the true branch
    expect(source).toContain('expo-router/unstable-native-tabs');
  });

  it('SC2.2 — source imports Tabs from expo-router (legacy fallback present)', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bTabs\b[^}]*\}\s*from\s*['"]expo-router['"]/);
  });
});

// ─── FR3: TAB_SCREENS shared constant ────────────────────────────────────────

describe('06-native-tabs — FR3: TAB_SCREENS shared constant', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
  });

  it('SC3.1 — source declares TAB_SCREENS constant', () => {
    expect(source).toMatch(/const\s+TAB_SCREENS\s*=/);
  });

  it('SC3.1 — TAB_SCREENS contains index tab', () => {
    expect(source).toContain("'index'");
  });

  it('SC3.1 — TAB_SCREENS contains overview tab', () => {
    expect(source).toContain("'overview'");
  });

  it('SC3.1 — TAB_SCREENS contains ai tab', () => {
    expect(source).toContain("'ai'");
  });

  it('SC3.1 — TAB_SCREENS contains approvals tab', () => {
    expect(source).toContain("'approvals'");
  });

  it('SC3.2 — TAB_SCREENS explore entry has href: null', () => {
    expect(source).toContain('href: null');
  });

  it('SC3.4 — TAB_SCREENS uses house.fill icon for Home tab', () => {
    expect(source).toContain('house.fill');
  });

  it('SC3.4 — TAB_SCREENS uses chart.bar.fill icon for Overview tab', () => {
    expect(source).toContain('chart.bar.fill');
  });

  it('SC3.4 — TAB_SCREENS uses sparkles icon for AI tab', () => {
    expect(source).toContain('sparkles');
  });

  it('SC3.4 — TAB_SCREENS uses checkmark.circle.fill icon for Requests tab', () => {
    expect(source).toContain('checkmark.circle.fill');
  });

  it('SC3.5 — TAB_SCREENS has title Home', () => {
    expect(source).toContain("'Home'");
  });

  it('SC3.5 — TAB_SCREENS has title Overview', () => {
    expect(source).toContain("'Overview'");
  });

  it('SC3.5 — TAB_SCREENS has title AI', () => {
    expect(source).toContain("'AI'");
  });

  it('SC3.5 — TAB_SCREENS has title Requests', () => {
    expect(source).toContain("'Requests'");
  });
});

// ─── FR4: NativeTabs navigator render path ───────────────────────────────────

describe('06-native-tabs — FR4: NativeTabs render path', () => {
  let source: string;
  let code: string; // comments stripped

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('SC4.1 — NativeTabs imported from expo-router/unstable-native-tabs', () => {
    expect(source).toContain('expo-router/unstable-native-tabs');
    expect(source).toMatch(/unstable_NativeTabs/);
  });

  it('SC4.2 — active tint color uses colors.violet', () => {
    expect(source).toContain('tabBarActiveTintColor');
    expect(source).toContain('colors.violet');
  });

  it('SC4.3 — inactive tint color uses colors.textMuted', () => {
    expect(source).toContain('tabBarInactiveTintColor');
    expect(source).toContain('colors.textMuted');
  });

  it('SC4.4 — NativeTabs path does NOT use tabBarBackground (unsupported)', () => {
    // tabBarBackground is not supported by NativeTabs
    expect(code).not.toContain('tabBarBackground');
  });

  it('SC4.5 / SC4.6 — badge logic derives count from items.length with undefined fallback', () => {
    // Badge is set to count when > 0, undefined when 0. May be inline or via variable.
    // Verify the critical ternary exists somewhere in source:
    //   items.length > 0 ? items.length : undefined
    expect(source).toContain('items.length');
    expect(source).toMatch(/items\.length\s*>\s*0\s*\?\s*items\.length\s*:\s*undefined/);
    expect(source).toContain('tabBarBadge');
  });

  it('SC4.7 — explore tab hidden via href: null', () => {
    expect(source).toContain('href: null');
  });
});

// ─── FR5: Legacy Tabs fallback — HapticTab removal ───────────────────────────

describe('06-native-tabs — FR5: legacy Tabs fallback / HapticTab removal', () => {
  let source: string;
  let code: string; // comments stripped

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
    code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('SC5.3 — source does NOT import HapticTab', () => {
    expect(code).not.toContain('haptic-tab');
    expect(code).not.toContain('HapticTab');
  });

  it('SC5.2 — source does NOT use tabBarButton: HapticTab', () => {
    expect(code).not.toMatch(/tabBarButton\s*:\s*HapticTab/);
  });

  it('SC5.1 — legacy Tabs import is present (fallback path)', () => {
    // <Tabs from expo-router must remain in source for the false-branch
    expect(source).toMatch(/import\s*\{[^}]*\bTabs\b[^}]*\}\s*from\s*['"]expo-router['"]/);
  });

  it('SC5.4 — tabBarStyle is present (legacy Tabs path)', () => {
    expect(source).toContain('tabBarStyle');
  });
});

// ─── FR6: NoiseOverlay layout unchanged ──────────────────────────────────────

describe('06-native-tabs — FR6: NoiseOverlay / outer wrapper unchanged', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(LAYOUT_FILE, 'utf8');
  });

  it('SC6.2 — outer View with flex: 1 is preserved', () => {
    expect(source).toContain('flex: 1');
  });

  it('SC6.1 — NoiseOverlay is imported', () => {
    expect(source).toContain('NoiseOverlay');
    expect(source).toContain('@/src/components/NoiseOverlay');
  });

  it('SC6.1 — <NoiseOverlay /> JSX element is present', () => {
    expect(source).toMatch(/<NoiseOverlay\s*\/>/);
  });

  it('SC6.3 — useHistoryBackfill hook is imported and called', () => {
    expect(source).toContain('useHistoryBackfill');
  });

  it('SC6.3 — useHoursData hook is imported and called', () => {
    expect(source).toContain('useHoursData');
  });

  it('SC6.3 — useAIData hook is imported and called', () => {
    expect(source).toContain('useAIData');
  });

  it('SC6.3 — useApprovalItems hook is imported and called', () => {
    expect(source).toContain('useApprovalItems');
  });

  it('SC6.3 — useConfig hook is imported and called', () => {
    expect(source).toContain('useConfig');
  });

  it('SC6.3 — useWidgetSync hook is imported and called', () => {
    expect(source).toContain('useWidgetSync');
  });
});
