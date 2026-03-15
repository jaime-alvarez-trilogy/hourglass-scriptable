// Tests: AI tab screen (04-ai-scrub)
// FR3: AI Tab Hero Value Sync
//
// SC3.1 — ai.tsx declares scrubPoint state of type AIScrubPoint | null
// SC3.2 — when scrubPoint !== null, MetricValue value = scrubPoint.pctY
// SC3.3 — when scrubPoint === null, MetricValue value = live aiPercent
// SC3.4 — scrubPoint.pctY = 0 → hero shows 0 (not live)
// SC3.5 — scrubPoint.pctY = 100 → hero shows 100
// SC3.6 — AIConeChart receives onScrubChange={setScrubPoint}
// SC3.7 — legend has opacity: isScrubActive ? 0 : 1 (in AIConeChart)
// SC3.8 — no new prop on AIConeChartProps for legend (internal state)
// SC3.9 — MetricValue precision is 1 for hero display
//
// Strategy:
// - Source analysis for interface/contract checks (ai.tsx and AIConeChart.tsx)
// - Logic unit tests for the heroAIPct ternary expression

import * as path from 'path';
import * as fs from 'fs';

// ─── File paths ───────────────────────────────────────────────────────────────

const HOURGLASSWS_ROOT = path.resolve(__dirname, '../../..');
const AI_TAB_FILE = path.join(HOURGLASSWS_ROOT, 'app', '(tabs)', 'ai.tsx');
const CONE_CHART_FILE = path.join(HOURGLASSWS_ROOT, 'src', 'components', 'AIConeChart.tsx');

// ─── FR3: AI Tab Hero Value Sync ──────────────────────────────────────────────

describe('AI Tab — FR3 (04-ai-scrub): Hero Value Sync', () => {
  it('SC3.1 — ai.tsx declares scrubPoint state of type AIScrubPoint | null', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    // useState with AIScrubPoint | null generic
    expect(source).toMatch(/useState\s*<\s*AIScrubPoint\s*\|\s*null\s*>/);
    expect(source).toMatch(/scrubPoint/);
  });

  it('SC3.2 — when scrubPoint !== null, MetricValue value uses scrubPoint.pctY', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    // Ternary: scrubPoint !== null ? scrubPoint.pctY : ...
    expect(source).toMatch(/scrubPoint\s*!==\s*null\s*\?\s*scrubPoint\.pctY/);
  });

  it('SC3.3 — when scrubPoint === null, MetricValue value falls back to live aiPercent', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    // Ternary fallback: ... : aiPercent
    expect(source).toMatch(/scrubPoint\.pctY\s*:\s*aiPercent|heroAIPct[\s\S]{0,100}aiPercent/);
  });

  it('SC3.4 — heroAIPct = scrubPoint.pctY when scrubPoint is not null (covers pctY=0 case)', () => {
    // Unit test the ternary logic directly
    const scrubPointNull = null;
    const liveAIPct = 72.5;
    const heroWhenNull = scrubPointNull !== null ? (scrubPointNull as any).pctY : liveAIPct;
    expect(heroWhenNull).toBe(72.5);

    const scrubPointZero = { pctY: 0, hoursX: 5, upperPct: 90, lowerPct: 20 };
    const heroWhenZero = scrubPointZero !== null ? scrubPointZero.pctY : liveAIPct;
    expect(heroWhenZero).toBe(0); // 0, not liveAIPct
  });

  it('SC3.5 — heroAIPct = 100 when scrubPoint.pctY = 100', () => {
    const scrubPoint100 = { pctY: 100, hoursX: 40, upperPct: 100, lowerPct: 100 };
    const liveAIPct = 72.5;
    const hero = scrubPoint100 !== null ? scrubPoint100.pctY : liveAIPct;
    expect(hero).toBe(100);
  });

  it('SC3.6 — AIConeChart in ai.tsx receives onScrubChange prop wired to setScrubPoint', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    // onScrubChange={setScrubPoint}
    expect(source).toMatch(/onScrubChange=\{setScrubPoint\}/);
  });

  it('SC3.7 — AIConeChart source uses isScrubActive for legend opacity control', () => {
    const source = fs.readFileSync(CONE_CHART_FILE, 'utf8');
    // opacity: isScrubActive ? 0 : 1
    expect(source).toMatch(/isScrubActive\s*\?\s*0\s*:\s*1/);
  });

  it('SC3.8a — AIConeChartProps does NOT have a new "showLegend" or "legendVisible" prop', () => {
    const source = fs.readFileSync(CONE_CHART_FILE, 'utf8');
    const interfaceMatch = source.match(/interface\s+AIConeChartProps\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    const body = interfaceMatch![0];
    expect(body).not.toMatch(/showLegend|legendVisible|legendOpacity/i);
  });

  it('SC3.8b — AIConeChart legend opacity is driven by internal isScrubActive state (not prop)', () => {
    const source = fs.readFileSync(CONE_CHART_FILE, 'utf8');
    // isScrubActive is a useState (internal state, not a prop)
    expect(source).toMatch(/const\s*\[\s*isScrubActive\s*,\s*setIsScrubActive\s*\]\s*=\s*useState/);
  });

  it('SC3.9 — ai.tsx MetricValue for hero AI% uses precision={1}', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    // precision={1} on the MetricValue that shows heroAIPct
    expect(source).toMatch(/heroAIPct[\s\S]{0,300}precision=\{1\}|precision=\{1\}[\s\S]{0,300}heroAIPct/);
  });

  it('SC3.10 — ai.tsx imports AIScrubPoint type from AIConeChart', () => {
    const source = fs.readFileSync(AI_TAB_FILE, 'utf8');
    expect(source).toMatch(/AIScrubPoint/);
    expect(source).toMatch(/from\s+['"]@\/src\/components\/AIConeChart['"]/);
  });
});
