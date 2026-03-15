# Checklist: 03-ai-tab-integration

## Phase 1.0 — Tests

### FR1: AI Tab — Prime Radiant Card

- [ ] Write test: renders Prime Radiant card with `AIConeChart` when data is available
- [ ] Write test: shows `SkeletonLoader height={240}` during initial load (`isLoading=true`, `data=null`)
- [ ] Write test: does not render Prime Radiant card when `data=null` and `isLoading=false`
- [ ] Write test: Prime Radiant card appears below BrainLift card and above daily breakdown card (render order)
- [ ] Write test: `AIConeChart` receives `size="full"`, `height={240}`, and `coneData` derived from `computeAICone`
- [ ] Write test: `chartKey` prop on `AIConeChart` increments when tab re-focuses (useFocusKey behavior)
- [ ] Write test: `weeklyLimit` passed to `computeAICone` comes from `config.weeklyLimit` (via `useConfig`)

### FR2: Home Tab — Compact AI Trajectory Card

- [ ] Write test: renders compact AI TRAJECTORY card with `AIConeChart` when `aiData` is available
- [ ] Write test: compact card is NOT rendered when `aiData=null`
- [ ] Write test: compact card appears between Zone 2 (THIS WEEK chart) and Zone 3 (EARNINGS card) in render order
- [ ] Write test: `AIConeChart` receives `size="compact"`, `height={100}`, and `coneData` derived from `computeAICone`
- [ ] Write test: no `onPress` or `TouchableOpacity` wraps the compact cone card
- [ ] Write test: `chartKey` prop reuses the existing `chartKey` from `useFocusKey()` in `index.tsx`
- [ ] Write test: `weeklyLimit` reuses the existing config-derived value from `index.tsx`

## Phase 1.1 — Implementation

### FR1: AI Tab — Prime Radiant Card

- [ ] Add imports: `AIConeChart`, `computeAICone`, `useFocusKey`, `useConfig`, `useMemo` to `app/(tabs)/ai.tsx`
- [ ] Add `const { config } = useConfig()` and `const weeklyLimit = config?.weeklyLimit ?? 40`
- [ ] Add `const chartKey = useFocusKey()`
- [ ] Add `useState` for `coneDims: { width: 0, height: 240 }`
- [ ] Add `coneData` useMemo: `data ? computeAICone(data.dailyBreakdown, weeklyLimit) : null`
- [ ] Insert Prime Radiant `<Card>` with `<SectionLabel>PRIME RADIANT</SectionLabel>` between BrainLift card and daily breakdown
- [ ] Add skeleton branch: `showSkeleton ? <SkeletonLoader height={240} /> : coneData ? (...chart...) : null`
- [ ] Add `<View style={{ height: 240 }} onLayout={e => setConeDims({ width: e.nativeEvent.layout.width, height: 240 })}>`
- [ ] Add `<AIConeChart key={chartKey} data={coneData} width={coneDims.width} height={240} size="full" />`
- [ ] Verify TypeScript compiles without errors

### FR2: Home Tab — Compact AI Trajectory Card

- [ ] Add imports: `useAIData`, `AIConeChart`, `computeAICone` to `app/(tabs)/index.tsx`
- [ ] Add `const { data: aiData } = useAIData()`
- [ ] Add `useState` for `compactConeDims: { width: 0, height: 100 }`
- [ ] Add `coneData` useMemo: `aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit) : null`
- [ ] Insert conditional compact card `{coneData && (<Card>...</Card>)}` between Zone 2 close and Zone 3 open
- [ ] Add `<SectionLabel className="mb-2">AI TRAJECTORY</SectionLabel>`
- [ ] Add `<View style={{ height: 100 }} onLayout={e => setCompactConeDims({ width: e.nativeEvent.layout.width, height: 100 })}>`
- [ ] Add `<AIConeChart key={chartKey} data={coneData} width={compactConeDims.width} height={100} size="compact" />`
- [ ] Verify no `TouchableOpacity` or `onPress` on the compact card
- [ ] Verify TypeScript compiles without errors

## Phase 1.2 — Review

- [ ] Run `spec-implementation-alignment`: verify all FR success criteria are met by the implementation
- [ ] Run `pr-review-toolkit:review-pr`: address any feedback
- [ ] Run `test-optimiser`: eliminate any redundant or low-value tests
- [ ] Run full test suite for both modified files — all tests passing
- [ ] Verify TypeScript strict compile passes with no errors on modified files
