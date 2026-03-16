# Checklist — 04-chart-polish

## Phase 4.0 — Tests (Write First, Must Fail Red)

### FR1 — TrendSparkline strokeWidth default
- [ ] Test: `TrendSparkline` renders with `strokeWidth` defaulting to `3` when no prop passed
- [ ] Test: `TrendSparkline` respects explicit `strokeWidth` prop when provided (backward compat)

### FR2 — TrendSparkline three-layer glow
- [ ] Test: Outer glow Paint has `strokeWidth={14}`
- [ ] Test: Outer glow `BlurMask` has `blur={12}`
- [ ] Test: Mid glow Paint exists with `strokeWidth={7}`
- [ ] Test: Mid glow `BlurMask` has `blur={4}`
- [ ] Test: Mid glow color uses `color + '80'` (50% opacity)
- [ ] Test: Core line has no `BlurMask` child

### FR3 — WeeklyBarChart todayColor prop
- [ ] Test: `WeeklyBarChart` accepts `todayColor` prop without TypeScript error
- [ ] Test: When `todayColor` is provided, today's bar uses that color
- [ ] Test: When `todayColor` is omitted, today's bar defaults to `colors.success`
- [ ] Test: Completed past days still use `colors.success`
- [ ] Test: Future days still use `colors.textMuted`

### FR4 — Home screen TODAY_BAR_COLORS mapping
- [ ] Test: `TODAY_BAR_COLORS` covers all 6 PanelState values (`onTrack`, `behind`, `critical`, `crushedIt`, `overtime`, `idle`)
- [ ] Test: `panelState === 'critical'` maps to `colors.critical`
- [ ] Test: `panelState === 'behind'` maps to `colors.warning`
- [ ] Test: `panelState === 'onTrack'` maps to `colors.success`
- [ ] Test: `panelState === 'crushedIt'` maps to `colors.overtimeWhiteGold`
- [ ] Test: `panelState === 'overtime'` maps to `colors.overtimeWhiteGold`
- [ ] Test: `panelState === 'idle'` maps to `colors.textMuted`
- [ ] Test: `WeeklyBarChart` in `index.tsx` receives `todayColor` prop driven by `panelState`

---

## Phase 4.1 — Implementation

### FR1 — TrendSparkline strokeWidth default
- [ ] Change `strokeWidth` prop default from `2` to `3` in `TrendSparkline.tsx`
- [ ] Verify all callers without explicit `strokeWidth` receive 3px (no caller changes needed)

### FR2 — TrendSparkline three-layer glow
- [ ] Update outer glow: `strokeWidth` 10→14, `BlurMask blur` 8→12 in `TrendSparkline.tsx`
- [ ] Insert mid glow layer: `strokeWidth={7}`, `color={color + '80'}`, `BlurMask blur={4}` in `TrendSparkline.tsx`
- [ ] Reference `AIConeChart.tsx` for exact JSX structure of glow layers

### FR3 — WeeklyBarChart todayColor prop
- [ ] Add `todayColor?: string` to `WeeklyBarChartProps` interface in `WeeklyBarChart.tsx`
- [ ] Destructure with default: `todayColor = colors.success`
- [ ] Replace hardcoded `colors.gold` for today's bar with `todayColor`

### FR4 — Home screen TODAY_BAR_COLORS mapping
- [ ] Define `TODAY_BAR_COLORS: Record<PanelState, string>` at module scope in `index.tsx`
- [ ] Import `PanelState` type if not already imported
- [ ] Pass `todayColor={TODAY_BAR_COLORS[panelState]}` to `WeeklyBarChart` in `index.tsx`
- [ ] Handle loading/undefined `panelState` case with fallback to `colors.success`

---

## Phase 4.2 — Review

- [ ] Run spec-implementation-alignment check
- [ ] Run pr-review-toolkit:review-pr
- [ ] Address any review feedback
- [ ] Run test-optimiser
- [ ] All tests passing (green)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
