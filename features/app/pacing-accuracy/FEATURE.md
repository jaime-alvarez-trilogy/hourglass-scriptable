# Feature: Pacing Accuracy — Fractional Days

## Feature ID

`pacing-accuracy`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Pacing Accuracy — Fractional Days Elapsed |
| **Contributors** | @trilogy |

## Files Touched

### Logic
- `hourglassws/src/lib/panelState.ts` (modify — fractional return + updated idle guard)

### Tests
- `hourglassws/src/lib/__tests__/panelState.test.ts` (modify — update + extend)

## Table of Contents

- [Feature Overview](#feature-overview)
- [Bug Description](#bug-description)
- [Intended State](#intended-state)
- [Changelog of Feature Specs](#changelog-of-feature-specs)

## Feature Overview

### Summary

The pacing badge (ON TRACK / BEHIND / CRITICAL) on the This Week screen shows incorrect state mid-day because `computeDaysElapsed` returns integer days. Tuesday at 7am returns `2`, making the expected hours denominator a full two days (16h for a 40h week) rather than the ~1.3 days actually elapsed. This causes workers who are ahead of pace to see BEHIND.

### Bug Description

**Scenario:** Tuesday 7am, 40h week, 12h logged.

With integer days:
```
daysElapsed = 2
expectedHours = (2 / 5) × 40 = 16h
pacingRatio = 12 / 16 = 75% → BEHIND ❌
```

With fractional days:
```
daysElapsed = 1 + 7/24 = 1.292
expectedHours = (1.292 / 5) × 40 = 10.33h
pacingRatio = 12 / 10.33 = 116% → ON TRACK ✅
```

### Goals

- `computeDaysElapsed` returns a fractional value (0.0–5.0) based on actual time of day
- Pacing ratio reflects hours elapsed, not whole days
- Idle state covers all of Monday when no hours logged (not just midnight)
- All existing tests updated; new edge case tests added
- No other files touched — the fix is entirely in `panelState.ts`

### Non-Goals

- Changes to pacing thresholds (85% / 60%)
- Changes to any other badge state logic
- Changes to UI components, hooks, or the hours calculation

## Intended State

When complete:

1. `computeDaysElapsed()` returns `0.0–5.0` where the fractional part represents how far through the current day the user is (`hours / 24`)
2. `computePanelState()` uses the fractional `daysElapsed` from (1) — no changes to its math needed
3. Idle guard updated: `days < 1 && hours === 0` → `'idle'` (all of Monday with no hours logged = getting started)
4. Vestigial `if (days === 0) return 'onTrack'` guard removed (it was only reachable at exact midnight with hours somehow already logged — not a real case)

### Key Behaviors

| When | daysElapsed | Expected hours (40h week) | Result |
|------|------------|--------------------------|--------|
| Mon midnight, 0h | 0.0 | 0h | idle |
| Mon 8am, 0h | 0.33 | — | idle (days < 1 guard) |
| Mon 8am, 4h | 0.33 | 2.67h | on track (150%) |
| Tue 7am, 12h | 1.29 | 10.33h | on track (116%) |
| Tue 7am, 6h | 1.29 | 10.33h | critical (58%) |
| Wed noon, 20h | 2.5 | 20h | on track (100%) |
| Fri 5pm, 40h | 5.0 | 40h | crushed it |
| Weekend, 40h | 5.0 | 40h | crushed it |

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-17 | [01-fractional-days](specs/01-fractional-days/spec-research.md) | Make computeDaysElapsed return fractional 0.0–5.0; update idle guard |
