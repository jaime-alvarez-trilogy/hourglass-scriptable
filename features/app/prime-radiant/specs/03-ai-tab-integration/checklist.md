# Checklist: 03-ai-tab-integration

## Phase 1.0 — Tests

### FR1: AI Tab — Prime Radiant Card

- [x] Write test: renders Prime Radiant card with `AIConeChart` when data is available
- [x] Write test: shows `SkeletonLoader height={240}` during initial load (`isLoading=true`, `data=null`)
- [x] Write test: does not render Prime Radiant card when `data=null` and `isLoading=false`
- [x] Write test: Prime Radiant card appears below BrainLift card and above daily breakdown card (render order)
- [x] Write test: `AIConeChart` receives `size="full"`, `height={240}`, and `coneData` derived from `computeAICone`
- [x] Write test: `chartKey` prop on `AIConeChart` increments when tab re-focuses (useFocusKey behavior)
- [x] Write test: `weeklyLimit` passed to `computeAICone` comes from `config.weeklyLimit` (via `useConfig`)

### FR2: Home Tab — Compact AI Trajectory Card

- [x] Write test: renders compact AI TRAJECTORY card with `AIConeChart` when `aiData` is available
- [x] Write test: compact card is NOT rendered when `aiData=null`
- [x] Write test: compact card appears between Zone 2 (THIS WEEK chart) and Zone 3 (EARNINGS card) in render order
- [x] Write test: `AIConeChart` receives `size="compact"`, `height={100}`, and `coneData` derived from `computeAICone`
- [x] Write test: no `onPress` or `TouchableOpacity` wraps the compact cone card
- [x] Write test: `chartKey` prop reuses the existing `chartKey` from `useFocusKey()` in `index.tsx`
- [x] Write test: `weeklyLimit` reuses the existing config-derived value from `index.tsx`

## Phase 1.1 — Implementation

### FR1: AI Tab — Prime Radiant Card

- [x] Add imports: `AIConeChart`, `computeAICone`, `useFocusKey`, `useConfig`, `useMemo` to `app/(tabs)/ai.tsx`
- [x] Add `const { config } = useConfig()` and `const weeklyLimit = config?.weeklyLimit ?? 40`
- [x] Add `const chartKey = useFocusKey()`
- [x] Add `useState` for `coneDims: { width: 0, height: 240 }`
- [x] Add `coneData` useMemo: `data ? computeAICone(data.dailyBreakdown, weeklyLimit) : null`
- [x] Insert Prime Radiant `<Card>` with `<SectionLabel>PRIME RADIANT</SectionLabel>` between BrainLift card and daily breakdown
- [x] Add skeleton branch: `showSkeleton ? <SkeletonLoader height={240} /> : coneData ? (...chart...) : null`
- [x] Add `<View style={{ height: 240 }} onLayout={e => setConeDims({ width: e.nativeEvent.layout.width, height: 240 })}>`
- [x] Add `<AIConeChart key={chartKey} data={coneData} width={coneDims.width} height={240} size="full" />`
- [x] Verify TypeScript compiles without errors

### FR2: Home Tab — Compact AI Trajectory Card

- [x] Add imports: `useAIData`, `AIConeChart`, `computeAICone` to `app/(tabs)/index.tsx`
- [x] Add `const { data: aiData } = useAIData()`
- [x] Add `useState` for `compactConeDims: { width: 0, height: 100 }`
- [x] Add `coneData` useMemo: `aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit) : null`
- [x] Insert conditional compact card `{coneData && (<Card>...</Card>)}` between Zone 2 close and Zone 3 open
- [x] Add `<SectionLabel className="mb-2">AI TRAJECTORY</SectionLabel>`
- [x] Add `<View style={{ height: 100 }} onLayout={e => setCompactConeDims({ width: e.nativeEvent.layout.width, height: 100 })}>`
- [x] Add `<AIConeChart key={chartKey} data={coneData} width={compactConeDims.width} height={100} size="compact" />`
- [x] Verify no `TouchableOpacity` or `onPress` on the compact card
- [x] Verify TypeScript compiles without errors

## Phase 1.2 — Review

- [x] Run `spec-implementation-alignment`: verify all FR success criteria are met by the implementation
- [x] Run `pr-review-toolkit:review-pr`: address any feedback
- [x] Run `test-optimiser`: eliminate any redundant or low-value tests
- [x] Run full test suite for both modified files — all tests passing
- [x] Verify TypeScript strict compile passes with no errors on modified files

## Session Notes

**2026-03-15**: Implementation complete.
- Phase 1.0: 1 commit — test(FR1,FR2) for both screens (49 tests, all red)
- Phase 1.1: 2 implementation commits — feat(FR1) and feat(FR2)
- Phase 1.2: 1 fix commit — fix(03-ai-tab-integration) for test mock updates
- 49/49 new tests passing; 50/50 existing AITab.test.tsx tests passing
- Pre-existing 12 failures in index.test.tsx (baseline unchanged)
