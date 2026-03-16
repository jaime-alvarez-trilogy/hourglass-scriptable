// Tests: app/(tabs)/overview.tsx (06-wiring-and-tokens)
// FR3: 4W/12W toggle active color — gold → violet
//
// Test approach:
// - Source-file static analysis (fs.readFileSync) for color token checks
// - Verify colors.gold not used in toggle pill Text styles
// - Verify colors.violet used instead
// - Verify earnings display (line 246) still uses colors.gold (not changed)

import * as fs from 'fs';
import * as path from 'path';

const OVERVIEW_FILE = path.resolve(__dirname, '../(tabs)/overview.tsx');

describe('overview — FR3: toggle active color (gold → violet)', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(OVERVIEW_FILE, 'utf8');
  });

  it('FR3.1 — source uses colors.violet in toggle Text style (active state)', () => {
    expect(source).toContain('colors.violet');
  });

  it('FR3.2 — toggle pill does NOT use colors.gold for active color', () => {
    // The toggle pill text color lines should not reference colors.gold
    // We check by finding the toggle section and verifying no gold there
    // The toggle uses "toggle4Active ? X : colors.textMuted" pattern — X must be colors.violet
    expect(source).toMatch(/toggle4Active\s*\?\s*colors\.violet/);
  });

  it('FR3.3 — 12W toggle also uses colors.violet (not colors.gold) for active state', () => {
    expect(source).toMatch(/!toggle4Active\s*\?\s*colors\.violet/);
  });

  it('FR3.4 — both toggle instances updated: no "toggle4Active ? colors.gold" pattern', () => {
    expect(source).not.toMatch(/toggle4Active\s*\?\s*colors\.gold/);
  });

  it('FR3.5 — no "!toggle4Active ? colors.gold" pattern (12W button fixed too)', () => {
    expect(source).not.toMatch(/!toggle4Active\s*\?\s*colors\.gold/);
  });

  it('FR3.6 — earnings display (non-toggle) still uses colors.gold (not changed)', () => {
    // Overview still has at least one colors.gold reference for earnings display
    // This ensures we did NOT remove all gold usage — only toggle pill usage
    const goldCount = (source.match(/colors\.gold/g) || []).length;
    expect(goldCount).toBeGreaterThanOrEqual(1);
  });

  it('FR3.7 — colors.violet token value is correct (#A78BFA)', () => {
    const { colors } = require('@/src/lib/colors');
    expect(colors.violet).toBe('#A78BFA');
  });

  it('FR3.8 — colors.textMuted inactive color still present in toggle', () => {
    // Inactive pill still uses textMuted
    expect(source).toContain('colors.textMuted');
  });
});
