# Spec Research: 01-fractional-days

## Spec

`features/app/pacing-accuracy/specs/01-fractional-days`

## Problem

`computeDaysElapsed` returns integers (0–5). Tuesday at 7am = `2`, making the pacing denominator a full two work days (16h) instead of the ~1.3 days actually elapsed (10.33h). Workers ahead of pace see BEHIND.

## Exploration Findings

### Files

| File | Role |
|------|------|
| `hourglassws/src/lib/panelState.ts` | Contains both functions — only file to change |
| `hourglassws/src/lib/__tests__/panelState.test.ts` | 68 assertions across 3 suites — needs updates |
| `hourglassws/app/(tabs)/index.tsx` | Only call site for both functions — no changes needed |

### Current `computeDaysElapsed` behavior

Returns integer 0–5 based on `Date.getDay()`:
- Monday at exactly 00:00:00 → `0` (special edge case)
- Monday (any other time) → `1`
- Tuesday → `2`, Wednesday → `3`, Thursday → `4`
- Friday / Saturday / Sunday → `5`

### Current `computePanelState` idle guards

```typescript
if (days === 0 && hours === 0) return 'idle';  // only at Mon midnight
if (days === 0) return 'onTrack';               // vestigial: midnight + hours somehow logged
```

Both guards become effectively dead code once `days` is always > 0 past Monday midnight. Need replacement.

### `computePanelState` math — already handles fractions

```typescript
const expectedHours = (days / 5) * weeklyLimit;
const pacingRatio = hours / expectedHours;
```

No changes needed — division already works correctly with fractional inputs.

## Key Decisions

### 1. Fractional formula

```typescript
// day: 1=Mon, 2=Tue, ..., 5=Fri (after getDay() normalization)
const dayIndex = day - 1; // 0-based: 0=Mon, 1=Tue, ..., 4=Fri
const hourOfDay = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
return dayIndex + hourOfDay / 24;
```

- Monday midnight (00:00:00) → `0 + 0/24 = 0.0` ✓ (idle guard still works)
- Monday 8am → `0 + 8/24 = 0.333`
- Tuesday 7am → `1 + 7/24 = 1.292`
- Friday/Weekend → clamped to `5.0` (no fractional needed — full week elapsed)

### 2. Idle guard replacement

Replace:
```typescript
if (days === 0 && hours === 0) return 'idle';
if (days === 0) return 'onTrack';
```

With:
```typescript
if (days < 1 && hours === 0) return 'idle';
```

- All of Monday with nothing logged = GETTING STARTED
- Once Tuesday begins (`days >= 1`), you're accountable to the pacing ratio
- Remove vestigial `onTrack` guard (not a real case)

### 3. Monday midnight edge case preserved

Monday midnight → `dayIndex = 0`, `hourOfDay = 0` → return `0.0`. The `days < 1 && hours === 0` guard catches it as idle. Behavior unchanged from current.

### 4. Weekend handling

`getDay() === 0 || 6` → return `5.0`. No fractional needed for weekends — the full work week has elapsed.

## Interface Contracts

### `computeDaysElapsed(now?: Date): number`

**Signature:** unchanged
**Return type:** `number` — was integer 0–5, now float 0.0–5.0

| Input | Return | Notes |
|-------|--------|-------|
| Monday 00:00:00 | 0.0 | Exact midnight edge case preserved |
| Monday HH:MM | 0 + HH/24 + MM/1440 | 0.0–1.0 exclusive |
| Tuesday HH:MM | 1 + HH/24 + MM/1440 | 1.0–2.0 exclusive |
| Wednesday HH:MM | 2 + fraction | 2.0–3.0 exclusive |
| Thursday HH:MM | 3 + fraction | 3.0–4.0 exclusive |
| Friday (any time) | 5.0 | Clamped — full week |
| Saturday / Sunday | 5.0 | Clamped — full week |

**Source:** local timezone via `getDay()`, `getHours()`, `getMinutes()`, `getSeconds()`

### `computePanelState(hoursWorked, weeklyLimit, daysElapsed): PanelState`

**Signature:** unchanged
**Change:** idle guard updated. Math unchanged.

```typescript
// BEFORE
if (days === 0 && hours === 0) return 'idle';
if (days === 0) return 'onTrack';

// AFTER
if (days < 1 && hours === 0) return 'idle';
// (second guard removed)
```

All other logic (overtime, crushedIt, onTrack, behind, critical) unchanged.

## Test Plan

### FR1: `computeDaysElapsed` returns fractional values

**Signature:** `computeDaysElapsed(now?: Date): number`

**Happy path (fractional):**
- [ ] Monday 8:00am → approximately 0.333 (within 0.001)
- [ ] Monday 12:00pm → approximately 0.500
- [ ] Tuesday 7:00am → approximately 1.292
- [ ] Tuesday 12:00pm → approximately 1.500
- [ ] Wednesday 9:00am → approximately 2.375
- [ ] Thursday 3:00pm → approximately 3.625

**Preserved behavior:**
- [ ] Monday 00:00:00 → exactly 0.0
- [ ] Friday (any time) → exactly 5.0
- [ ] Saturday → exactly 5.0
- [ ] Sunday → exactly 5.0

**Removed integer behavior (update existing tests):**
- [ ] Monday 08:00 no longer returns integer `1`
- [ ] Tuesday 12:00 no longer returns integer `2`
- [ ] Wednesday 09:00 no longer returns integer `3`

### FR2: `computePanelState` idle guard updated

**Signature:** `computePanelState(hoursWorked, weeklyLimit, daysElapsed): PanelState`

**New idle cases:**
- [ ] `daysElapsed=0.333, hours=0, limit=40` → `'idle'` (Monday 8am, nothing logged)
- [ ] `daysElapsed=0.999, hours=0, limit=40` → `'idle'` (Mon 11:58pm, nothing logged)
- [ ] `daysElapsed=0.0, hours=0, limit=40` → `'idle'` (Monday midnight — preserved)

**No longer idle:**
- [ ] `daysElapsed=1.0, hours=0, limit=40` → `'critical'` (Tuesday has started, 0 hours = bad)
- [ ] `daysElapsed=1.292, hours=0, limit=40` → `'critical'` (Tuesday 7am, nothing logged)

**Vestigial guard removed:**
- [ ] `daysElapsed=0.0, hours=5, limit=40` → `'onTrack'` (no longer special-cased; ratio = 5/0 = Infinity → onTrack via ≥ 0.85 check... wait: days=0 → expectedHours=0 → division by zero)

Hmm — edge case: if `daysElapsed=0.0` and `hours > 0`, `expectedHours = 0`, division by zero. The old `if (days === 0) return 'onTrack'` guard prevented this. Need to keep a guard for `days === 0` specifically (the `days < 1 && hours === 0` guard handles the 0-hours case but not the has-hours case at exact midnight).

**Updated guard logic:**
```typescript
if (days < 1 && hours === 0) return 'idle';
if (days === 0) return 'onTrack';  // keep: prevents division by zero at exact midnight with hours
```

Or simpler: check `expectedHours` before dividing:
```typescript
if (days < 1 && hours === 0) return 'idle';
const expectedHours = (days / 5) * weeklyLimit;
if (expectedHours === 0) return 'onTrack'; // covers days === 0 with hours > 0 (midnight edge)
```

- [ ] `daysElapsed=0.0, hours=5, limit=40` → `'onTrack'` (midnight with hours somehow logged — handled by zero-guard)

**Pacing accuracy (core fix):**
- [ ] `daysElapsed=1.292, hours=12, limit=40` → `'onTrack'` (Tue 7am, 12h — the original bug case)
- [ ] `daysElapsed=1.292, hours=8, limit=40` → `'onTrack'` (77% of 10.33h expected)
- [ ] `daysElapsed=1.292, hours=5, limit=40` → `'critical'` (48% of 10.33h expected)

**Update existing integer-based tests** (Tuesday = 2 → behind) to fractional equivalents.

## Files to Reference

- `hourglassws/src/lib/panelState.ts` — both functions, constants
- `hourglassws/src/lib/__tests__/panelState.test.ts` — existing test patterns and suite structure

## Out of Scope

- `index.tsx` — no changes (call sites unchanged)
- `useHoursData` — no changes
- UI components — no changes
- Pacing thresholds (`PACING_ON_TRACK_THRESHOLD`, `PACING_BEHIND_THRESHOLD`) — unchanged
