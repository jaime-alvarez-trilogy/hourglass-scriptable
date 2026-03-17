# Spec: 01-fractional-days

**Status:** Draft
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Owner:** @trilogy

---

## Overview

### What Is Being Built

`computeDaysElapsed` currently returns integer values (0–5), causing incorrect pacing calculations mid-day. This spec changes it to return fractional float values (0.0–5.0) so the pacing denominator reflects actual hours elapsed, not whole days.

A companion change updates the idle guard in `computePanelState` from `days === 0 && hours === 0` to `days < 1 && hours === 0`, so all of Monday with no hours logged correctly shows the idle/getting-started state.

### How It Works

**Fractional formula:**
```
dayIndex = workday index (0=Mon, 1=Tue, ..., 4=Fri)
hourOfDay = getHours() + getMinutes()/60 + getSeconds()/3600
result = dayIndex + hourOfDay / 24
```

- Monday 8am → `0 + 8/24 = 0.333`
- Tuesday 7am → `1 + 7/24 = 1.292`
- Friday and weekends → clamped to `5.0` (full week elapsed, no fractional needed)
- Monday midnight → `0.0` (preserved edge case)

**Why this fixes the bug:**

Before: Tuesday 7am → `daysElapsed = 2` → `expectedHours = (2/5)×40 = 16h` → 12h worked = 75% → BEHIND

After: Tuesday 7am → `daysElapsed = 1.292` → `expectedHours = (1.292/5)×40 = 10.33h` → 12h worked = 116% → ON TRACK

### Timezone Design

`computeDaysElapsed` uses **local timezone** (`getDay()`, `getHours()`, `getMinutes()`, `getSeconds()`). This is intentional and must not change. The `hoursWorked` value comes from the Crossover API which uses UTC week boundaries — this mismatch is expected and correct (see spec-research.md for rationale).

### Scope

Only `hourglassws/src/lib/panelState.ts` is modified. No UI changes, no hook changes, no threshold changes.

---

## Out of Scope

1. **Pacing threshold changes (`PACING_ON_TRACK_THRESHOLD`, `PACING_BEHIND_THRESHOLD`)** — **Descoped.** The 85%/60% thresholds remain unchanged. Recalibrating thresholds to account for fractional inputs is a separate concern and out of scope here.

2. **UI component changes** — **Descoped.** No changes to badge rendering, color mapping, or any React component. The pacing badge consumes `PanelState` output — its behavior improves automatically once the input is more accurate.

3. **`useHoursData` hook changes** — **Descoped.** The hook passes `daysElapsed` through unchanged; the fractional value flows through transparently.

4. **`index.tsx` call-site changes** — **Descoped.** The call signature for both `computeDaysElapsed` and `computePanelState` is unchanged. No callers need updating.

5. **UTC week deadline awareness in `computeDaysElapsed`** — **Descoped.** The function returns 5.0 for all of Friday, Saturday, and Sunday. It is intentionally not aware of the Sunday 23:59:59 UTC week close. The `timeRemaining` field (via `getSundayMidnightGMT()`) handles deadline urgency separately.

6. **Friday fractional values** — **Descoped.** Friday clamps to 5.0 regardless of time of day. The full workweek denominator applies once Friday begins.

7. **Android/widget targets** — **Descoped.** This fix is in shared logic consumed by all targets; no platform-specific changes are needed.

---

## Functional Requirements

### FR1: `computeDaysElapsed` returns fractional 0.0–5.0

**Description:** Change `computeDaysElapsed` to return a float representing how far through the workweek the current moment is, using local timezone.

**Success Criteria:**

| Input | Expected Output | Tolerance |
|-------|----------------|-----------|
| Monday 00:00:00 | 0.0 | exact |
| Monday 08:00:00 | ≈ 0.333 | ±0.001 |
| Monday 12:00:00 | ≈ 0.500 | ±0.001 |
| Tuesday 07:00:00 | ≈ 1.292 | ±0.001 |
| Tuesday 12:00:00 | ≈ 1.500 | ±0.001 |
| Wednesday 09:00:00 | ≈ 2.375 | ±0.001 |
| Thursday 15:00:00 | ≈ 3.625 | ±0.001 |
| Friday (any time) | 5.0 | exact |
| Saturday (any time) | 5.0 | exact |
| Sunday (any time) | 5.0 | exact |

**Formula:**
```typescript
const dayIndex = day - 1; // 0=Mon, 1=Tue, ..., 4=Fri (day from getDay(), normalized)
const hourOfDay = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
return dayIndex + hourOfDay / 24;
```

**Constraints:**
- Must use local timezone (`getDay()`, `getHours()`, `getMinutes()`, `getSeconds()`) — not UTC
- Function signature `computeDaysElapsed(now?: Date): number` unchanged
- Friday must clamp to 5.0 (not fractional)
- Saturday and Sunday must return exactly 5.0
- Called with no argument must not crash and must return value in [0, 5]

---

### FR2: `computePanelState` idle guard updated

**Description:** Replace the pair of `days === 0` guards with a single `days < 1 && hours === 0` guard, plus a division-by-zero safeguard for exact midnight with hours logged.

**Success Criteria:**

| Input (`hoursWorked`, `weeklyLimit`, `daysElapsed`) | Expected State |
|-----------------------------------------------------|----------------|
| `(0, 40, 0.0)` | `'idle'` |
| `(0, 40, 0.333)` | `'idle'` |
| `(0, 40, 0.999)` | `'idle'` |
| `(5, 40, 0.0)` | `'onTrack'` (midnight with hours — division-by-zero guard) |
| `(0, 40, 1.0)` | `'critical'` (Tuesday has begun, nothing logged) |
| `(0, 40, 1.292)` | `'critical'` (Tue 7am, nothing logged) |
| `(12, 40, 1.292)` | `'onTrack'` (116% of 10.33h expected — the original bug case) |
| `(8, 40, 1.292)` | `'onTrack'` (77% of 10.33h expected) |
| `(5, 40, 1.292)` | `'critical'` (48% of 10.33h expected) |

**Guard logic after change:**
```typescript
if (days < 1 && hours === 0) return 'idle';
const expectedHours = (days / 5) * weeklyLimit;
if (expectedHours === 0) return 'onTrack'; // division-by-zero guard (exact midnight with hours > 0)
```

**Constraints:**
- All states other than `idle` must continue to use the existing pacing ratio logic
- `overtime`, `crushedIt` checks (before the idle guard) are not affected
- Threshold constants `PACING_ON_TRACK_THRESHOLD` and `PACING_BEHIND_THRESHOLD` unchanged

---

## Technical Design

### Files to Reference

| File | Role |
|------|------|
| `hourglassws/src/lib/panelState.ts` | Only file to modify |
| `hourglassws/src/lib/__tests__/panelState.test.ts` | Existing tests — update + extend |
| `hourglassws/app/(tabs)/index.tsx` | Call site — no changes needed |

### Files to Modify

**`hourglassws/src/lib/panelState.ts`**

Two changes:

**1. `computeDaysElapsed` — fractional return:**

```typescript
// BEFORE (returns integer)
if (day === 4) return 4;
if (day === 3) return 3;
if (day === 2) return 2;
// Monday...
return 1;

// AFTER (returns float)
// Friday → full week
if (day === 5) return 5;

// Mon–Thu: fractional
// day: 1=Mon, 2=Tue, 3=Wed, 4=Thu → dayIndex: 0–3
const dayIndex = day - 1;
const hourOfDay = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
return dayIndex + hourOfDay / 24;
```

The Monday midnight edge case (return 0) becomes natural: Monday midnight → `dayIndex=0`, `hourOfDay=0` → `0 + 0/24 = 0.0`. The explicit midnight check can be removed.

**2. `computePanelState` — idle guard replacement:**

```typescript
// BEFORE
if (days === 0 && hours === 0) return 'idle';
if (days === 0) return 'onTrack';

// AFTER
if (days < 1 && hours === 0) return 'idle';
const expectedHours = (days / 5) * weeklyLimit;
if (expectedHours === 0) return 'onTrack'; // division-by-zero guard (exact midnight + hours)
```

Note: `expectedHours` moves before the pacing ratio calculation. The pacing ratio line `const pacingRatio = hours / expectedHours;` follows and is only reached when `expectedHours > 0`.

### Data Flow

```
computeDaysElapsed(now)
  → local Date.getDay() / getHours() / getMinutes() / getSeconds()
  → float 0.0–5.0

computePanelState(hoursWorked, weeklyLimit, daysElapsed)
  → idle guard: days < 1 && hours === 0
  → zero guard: expectedHours === 0 → onTrack
  → pacingRatio = hours / expectedHours
  → threshold comparison → PanelState
```

### Edge Cases

| Case | Handling |
|------|----------|
| Monday midnight (00:00:00) | `dayIndex=0 + 0/24 = 0.0` — naturally correct without special case |
| Monday 00:00:01 | `0 + 1/86400 ≈ 0.0000116` — tiny but non-zero, idle guard catches it (< 1 && hours === 0) |
| Friday any time | Returns 5.0 — no fractional for Friday |
| Saturday / Sunday | Returns 5.0 — weekend clamp unchanged |
| `daysElapsed = 0.0, hours > 0` | `expectedHours = 0` → `onTrack` via zero guard (prevents NaN/Infinity in ratio) |
| `daysElapsed = 1.0, hours = 0` | `days < 1` is false → falls through to pacing ratio: `0 / 8 = 0` → `critical` |
| Negative or >5 inputs to `computePanelState` | Clamped by `Math.max(0, Math.min(5, daysElapsed))` — unchanged |

### JSDoc Updates

Update `computeDaysElapsed` JSDoc to reflect:
- Return type is `number` (float 0.0–5.0, not integer 0–5)
- Remove integer examples, add fractional examples
- Update description from "0–5" to "0.0–5.0"

Update `computePanelState` JSDoc:
- Update `@param daysElapsed` to note fractional values now accepted
