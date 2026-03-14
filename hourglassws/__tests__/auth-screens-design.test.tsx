/**
 * @jest-environment node
 */
// 08-auth-screens: Design token tests (Phase 8.0)
//
// Tests design system compliance for all 5 rebuilt auth screens + AuthContainer.
//
// NOTE on NativeWind v4 + Jest:
// NativeWind v4 transforms className to hashed IDs in Jest/node.
// className assertions are done via source-file static analysis (fs.readFileSync),
// NOT rendered prop assertions. This is the established pattern from Card.test.tsx.
//
// Permitted hex values (not flagged as violations):
//   - placeholderTextColor="#484F58"  (textMuted — cannot use className on this prop)
//   - color="#8B949E" on ActivityIndicator (textSecondary — cannot use className on this prop)
//
// The hex regex matches #RRGGBB and #RRGGBBAA patterns.
// We strip comments before checking to avoid flagging legacy comments.

import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ───────────────────────────────────────────────────────────────

const AUTH_DIR = path.resolve(__dirname, '../app/(auth)');
const WELCOME_FILE = path.join(AUTH_DIR, 'welcome.tsx');
const CREDENTIALS_FILE = path.join(AUTH_DIR, 'credentials.tsx');
const VERIFYING_FILE = path.join(AUTH_DIR, 'verifying.tsx');
const SETUP_FILE = path.join(AUTH_DIR, 'setup.tsx');
const SUCCESS_FILE = path.join(AUTH_DIR, 'success.tsx');

// AuthContainer may live in its own file or inline in each screen.
// We check each screen source for the relevant className tokens — if AuthContainer
// is extracted to _container.tsx, we also check that file.
const CONTAINER_FILE = path.join(AUTH_DIR, '_container.tsx');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip single-line and block comments from source code.
 * Used to avoid flagging hex values in legacy code comments.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Read source file and return [raw source, comment-stripped source].
 * Throws a descriptive error if file does not exist.
 */
function readScreen(filePath: string): [string, string] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Screen file not found: ${filePath}\nExpected after FR implementation.`);
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const code = stripComments(source);
  return [source, code];
}

/**
 * Hex color check — returns true if non-permitted hex values exist in code (comments stripped).
 * Permitted: #484F58 (placeholderTextColor) and #8B949E (ActivityIndicator color).
 */
function hasNonPermittedHex(code: string): boolean {
  // Find all hex patterns in comment-stripped code
  const hexPattern = /#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?\b/g;
  const permitted = new Set(['#484F58', '#484f58', '#8B949E', '#8b949e']);
  const found: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = hexPattern.exec(code)) !== null) {
    if (!permitted.has(match[0].toUpperCase()) && !permitted.has(match[0])) {
      // Normalize and check
      const upper = match[0].toUpperCase();
      if (upper !== '#484F58' && upper !== '#8B949E') {
        found.push(match[0]);
      }
    }
  }
  return found.length > 0;
}

// ─── FR1: AuthContainer ───────────────────────────────────────────────────────

describe('FR1: AuthContainer — shared SafeAreaView wrapper', () => {
  // AuthContainer may be inline in each screen or in _container.tsx.
  // We verify the tokens appear in at least one of the screen sources OR _container.tsx.
  // Since all screens must use it, we check the welcome screen as representative.

  it('SC1.2 — bg-background appears in welcome source (AuthContainer provider)', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('bg-background');
  });

  it('SC1.3 — flex-1 appears in welcome source (AuthContainer provider)', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('flex-1');
  });

  it('SC1.4 — SafeAreaView imported from react-native-safe-area-context in welcome source', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('react-native-safe-area-context');
    expect(source).toContain('SafeAreaView');
  });

  it('SC1.5 — welcome source does not use StyleSheet.create', () => {
    const [, code] = readScreen(WELCOME_FILE);
    expect(code).not.toContain('StyleSheet.create');
  });

  it('SC1.6 — welcome source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(WELCOME_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });

  // If _container.tsx exists, run specific checks on it
  it('SC1.2+SC1.4 — if _container.tsx exists, it has bg-background and SafeAreaView', () => {
    if (!fs.existsSync(CONTAINER_FILE)) {
      // Inline pattern — pass (already checked via welcome source above)
      return;
    }
    const [source, code] = readScreen(CONTAINER_FILE);
    expect(source).toContain('bg-background');
    expect(source).toContain('SafeAreaView');
    expect(source).toContain('react-native-safe-area-context');
    expect(code).not.toContain('StyleSheet.create');
    expect(hasNonPermittedHex(code)).toBe(false);
  });
});

// ─── FR2: welcome.tsx ─────────────────────────────────────────────────────────

describe('FR2: welcome.tsx — design tokens and animations', () => {
  it('SC2.2 — source contains font-display-bold class string', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('font-display-bold');
  });

  it('SC2.3 — source contains bg-gold class string', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('bg-gold');
  });

  it('SC2.6 — source does not use StyleSheet.create', () => {
    const [, code] = readScreen(WELCOME_FILE);
    expect(code).not.toContain('StyleSheet.create');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC2.7 — source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(WELCOME_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });

  it('SC2.8 — source imports springBouncy from reanimated-presets', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('springBouncy');
    expect(source).toContain('reanimated-presets');
  });

  it('SC2.9 — source imports from react-native-reanimated', () => {
    const [source] = readScreen(WELCOME_FILE);
    expect(source).toContain('react-native-reanimated');
  });
});

// ─── FR3: credentials.tsx ─────────────────────────────────────────────────────

describe('FR3: credentials.tsx — design tokens and focus state', () => {
  it('SC3.6 — source contains bg-surface class string', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('bg-surface');
  });

  it('SC3.6 — source contains border-border class string', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('border-border');
  });

  it('SC3.7 — source contains border-gold class string (focus state)', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('border-gold');
  });

  it('SC3.8 — source contains bg-gold class string on CTA', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('bg-gold');
  });

  it('SC3.9 — source contains text-critical class string', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('text-critical');
  });

  it('SC3.10 — source contains KeyboardAvoidingView import', () => {
    const [source] = readScreen(CREDENTIALS_FILE);
    expect(source).toContain('KeyboardAvoidingView');
  });

  it('SC3.13 — source does not use StyleSheet.create', () => {
    const [, code] = readScreen(CREDENTIALS_FILE);
    expect(code).not.toContain('StyleSheet.create');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC3.14 — source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(CREDENTIALS_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });
});

// ─── FR4: verifying.tsx ───────────────────────────────────────────────────────

describe('FR4: verifying.tsx — design tokens', () => {
  it('SC4.6 — source contains text-textSecondary class string', () => {
    const [source] = readScreen(VERIFYING_FILE);
    expect(source).toContain('text-textSecondary');
  });

  it('SC4.7 — source does not use StyleSheet.create', () => {
    const [, code] = readScreen(VERIFYING_FILE);
    expect(code).not.toContain('StyleSheet.create');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC4.8 — source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(VERIFYING_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });
});

// ─── FR5: setup.tsx ───────────────────────────────────────────────────────────

describe('FR5: setup.tsx — design tokens', () => {
  it('SC5.6 — source contains bg-surface class string', () => {
    const [source] = readScreen(SETUP_FILE);
    expect(source).toContain('bg-surface');
  });

  it('SC5.6 — source contains border-border class string', () => {
    const [source] = readScreen(SETUP_FILE);
    expect(source).toContain('border-border');
  });

  it('SC5.7 — source contains bg-gold class string on CTA', () => {
    const [source] = readScreen(SETUP_FILE);
    expect(source).toContain('bg-gold');
  });

  it('SC5.8 — source contains text-critical class string', () => {
    const [source] = readScreen(SETUP_FILE);
    expect(source).toContain('text-critical');
  });

  it('SC5.9 — source contains KeyboardAvoidingView import', () => {
    const [source] = readScreen(SETUP_FILE);
    expect(source).toContain('KeyboardAvoidingView');
  });

  it('SC5.10 — source does not use StyleSheet.create', () => {
    const [, code] = readScreen(SETUP_FILE);
    expect(code).not.toContain('StyleSheet.create');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC5.11 — source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(SETUP_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });
});

// ─── FR6: success.tsx ─────────────────────────────────────────────────────────

describe('FR6: success.tsx — design tokens and animations', () => {
  it('SC6.7 — source contains bg-gold class string on CTA', () => {
    const [source] = readScreen(SUCCESS_FILE);
    expect(source).toContain('bg-gold');
  });

  it('SC6.8 — source contains text-gold class string', () => {
    const [source] = readScreen(SUCCESS_FILE);
    expect(source).toContain('text-gold');
  });

  it('SC6.9 — source imports springBouncy from reanimated-presets', () => {
    const [source] = readScreen(SUCCESS_FILE);
    expect(source).toContain('springBouncy');
    expect(source).toContain('reanimated-presets');
  });

  it('SC6.10 — source imports from react-native-reanimated', () => {
    const [source] = readScreen(SUCCESS_FILE);
    expect(source).toContain('react-native-reanimated');
  });

  it('SC6.11 — source does not use StyleSheet.create', () => {
    const [, code] = readScreen(SUCCESS_FILE);
    expect(code).not.toContain('StyleSheet.create');
    expect(code).not.toMatch(/\bStyleSheet\b/);
  });

  it('SC6.12 — source does not contain non-permitted hardcoded hex values', () => {
    const [, code] = readScreen(SUCCESS_FILE);
    expect(hasNonPermittedHex(code)).toBe(false);
  });
});
