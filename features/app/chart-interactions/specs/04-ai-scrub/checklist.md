# Checklist: 04-ai-scrub

**Spec:** AIConeChart scrub gesture + AI tab hero value sync
**Blocked by:** 03-scrub-engine (complete)

---

## Phase 4.0 — Tests (Red Phase)

Write tests first. All tests must fail before implementation begins.

### FR1: AIConeChart Scrub Gesture Integration

- [x] SC1.1 — `AIConeChartProps` interface includes `onScrubChange?: (point: AIScrubPoint | null) => void` (source analysis)
- [x] SC1.2 — `AIScrubPoint` is exported from `AIConeChart.tsx` with `pctY`, `hoursX`, `upperPct`, `lowerPct` fields (source analysis)
- [x] SC1.3 — `onScrubChange` fires with `AIScrubPoint` when `size="full"` and user drags (render/source test)
- [x] SC1.4 — `onScrubChange(null)` fires when finger lifts on `size="full"` chart (source analysis)
- [x] SC1.5 — `size="compact"`: `onScrubChange` never fires (gesture disabled, source analysis)
- [x] SC1.6 — No crash when `onScrubChange` not provided (render test)
- [x] SC1.7 — Empty `hourlyPoints`: no crash (render test with MONDAY_CONE_DATA variant)
- [x] SC1.8 — `hourlyPoints.length === 1`: callback fires with index 0 data (source analysis)
- [x] SC1.9 — Source imports `useScrubGesture` from `@/src/hooks/useScrubGesture` (source analysis)
- [x] SC1.10 — Source wraps Canvas in `GestureDetector` from `react-native-gesture-handler` (source analysis)

### FR2: ScrubCursor Rendering

- [x] SC2.1 — Source imports `buildScrubCursor` from `@/src/components/ScrubCursor` (source analysis)
- [x] SC2.2 — When `isScrubActive === true`, a `Path` rendered with `colors.textMuted` at `opacity={0.5}` (source analysis)
- [x] SC2.3 — When `isScrubActive === true`, a `Circle` rendered at snapped dot position (source analysis)
- [x] SC2.4 — When `isScrubActive === false`, cursor layers not rendered (conditional guard in source)
- [x] SC2.5 — Cursor layers rendered after all other chart path layers (source position analysis)
- [x] SC2.6 — `scrubCursor.linePath` produced by `buildScrubCursor` (source analysis)
- [x] SC2.7 — `size="compact"` chart: no cursor rendered (source analysis)

### FR3: AI Tab Hero Value Sync

- [x] SC3.1 — `ai.tsx` declares `scrubPoint` state of type `AIScrubPoint | null` (source analysis)
- [x] SC3.2 — When `scrubPoint !== null`, MetricValue `value` equals `scrubPoint.pctY` (source analysis)
- [x] SC3.3 — When `scrubPoint === null`, MetricValue `value` equals live `aiPercent` (source analysis)
- [x] SC3.4 — `scrubPoint.pctY = 0` → hero shows `0` not live value (source analysis of ternary)
- [x] SC3.5 — `scrubPoint.pctY = 100` → hero shows `100` (source analysis of ternary)
- [x] SC3.6 — AIConeChart in `ai.tsx` receives `onScrubChange={setScrubPoint}` prop (source analysis)
- [x] SC3.7 — Legend has `opacity: isScrubActive ? 0 : 1` or equivalent (source analysis)
- [x] SC3.8 — Legend visibility uses `isScrubActive` bridged state, no new prop on `AIConeChartProps` (source analysis)
- [x] SC3.9 — MetricValue `precision` is `1` for the AI% hero display (source analysis)

---

## Phase 4.1 — Implementation (Green Phase)

Make all tests pass. No new code beyond what's needed to pass tests.

### FR1: AIConeChart Scrub Gesture Integration

- [x] Export `AIScrubPoint` interface from `AIConeChart.tsx`
- [x] Add `onScrubChange?: (point: AIScrubPoint | null) => void` to `AIConeChartProps`
- [x] Add `pixelXs` computation to existing `useMemo` (map `hourlyPoints` through `toPixelFn`)
- [x] Call `useScrubGesture({ pixelXs, enabled: size === 'full' })`
- [x] Add `useAnimatedReaction` on `scrubIndex` → `runOnJS(onScrubChange)(point)`
- [x] Add `useAnimatedReaction` on `isScrubbing` false → `runOnJS(onScrubChange)(null)`
- [x] Wrap `Canvas` in `GestureDetector gesture={gesture}`
- [x] Import `GestureDetector` from `react-native-gesture-handler`
- [x] Import `useScrubGesture` from `@/src/hooks/useScrubGesture`

### FR2: ScrubCursor Rendering

- [x] Import `buildScrubCursor`, `ScrubCursorResult` from `@/src/components/ScrubCursor`
- [x] Add `isScrubActive` React state (bridged from `isScrubbing`)
- [x] Add `scrubCursor` React state (bridged from `scrubIndex` via `buildScrubCursor`)
- [x] Add `useAnimatedReaction` on `isScrubbing` → `runOnJS(setIsScrubActive)(scrubbing)`
- [x] Add `useAnimatedReaction` on `scrubIndex` → `runOnJS(setScrubCursor)(buildScrubCursor(...))`
- [x] Add conditional `<Path>` (cursor line) and `<Circle>` (dot) at end of Canvas, guarded by `isScrubActive && scrubCursor`
- [x] Add legend `opacity: isScrubActive ? 0 : 1` to the legend row View

### FR3: AI Tab Hero Value Sync

- [x] Import `AIScrubPoint` type from `@/src/components/AIConeChart` in `ai.tsx`
- [x] Add `scrubPoint` state: `const [scrubPoint, setScrubPoint] = useState<AIScrubPoint | null>(null)`
- [x] Compute `heroAIPct = scrubPoint !== null ? scrubPoint.pctY : aiPercent`
- [x] Update `MetricValue` to use `value={heroAIPct}` and `precision={1}`
- [x] Pass `onScrubChange={setScrubPoint}` to `AIConeChart`

---

## Phase 4.2 — Review

- [x] Run `spec-implementation-alignment` — PASS (all SC criteria verified)
- [x] Run `pr-review-toolkit:review-pr` — not available; manual code review performed, no issues found
- [x] Address any review feedback — no issues found
- [x] Run `test-optimiser` — 115 tests passing, coverage is complete and behavior-focused

---

## Files Modified

- `hourglassws/src/components/AIConeChart.tsx`
- `hourglassws/app/(tabs)/ai.tsx`
- `hourglassws/src/components/__tests__/AIConeChart.test.tsx` (new tests appended)
- `hourglassws/app/(tabs)/__tests__/ai.test.tsx` (new file)
- `hourglassws/__mocks__/react-native-gesture-handler.ts` (new mock)

---

## Session Notes

**2026-03-15**: Implementation complete.
- Phase 4.0: 1 test commit (FR1+FR2 in AIConeChart.test.tsx, FR3 in ai.test.tsx) — 27 new tests, all red
- Phase 4.1: 3 implementation commits (feat(FR1), feat(FR3), fix test SC2.5) — all 115 tests green
- Phase 4.2: Alignment PASS, code quality review clean, no regressions introduced
- All tests passing. No pre-existing failures introduced.
