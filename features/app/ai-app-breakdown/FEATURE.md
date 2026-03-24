# AI App Breakdown

## Overview

Surfaces which applications are earning AI credit and which are not, based on WorkSmart's automatic AI classification. Provides 12-week historical trends and actionable guidance so the user can shift more work into AI-credited apps.

**Key insight:** WorkSmart auto-assigns `ai_usage`/`second_brain` tags based on AI-generated text patterns and app-level heuristics. The user never manually tags. This feature answers: *"Which apps am I using that the system doesn't count as AI — so I can move more work there?"*

## Problem

The AI% metric is a single number. When it stagnates or drops, users have no visibility into which apps are dragging it down. Historical trends exist for the overall AI%, but there's no per-app breakdown or actionable diagnosis.

## Goal

Show a ranked breakdown of apps by AI-credited vs non-AI slots (current week + 12-week aggregate), plus 1–3 generated guidance chips pointing to the highest-leverage opportunities.

## Data Source

All app breakdown data is derived from `slot.events[].processName` in the work diary API response:

```
GET /api/timetracking/workdiaries?assignmentId={id}&date=YYYY-MM-DD
→ WorkDiarySlot[]
→ slot.events[]: { processName, idle, activity }
→ slot.tags[]: auto-assigned by WorkSmart (ai_usage | second_brain | not_second_brain)
```

**Zero additional API calls.** `useAIData` and `useHistoryBackfill` already fetch this data; `events[]` is currently discarded after tag counting. This feature captures it before discard.

## Scope

### In Scope
- Extend `WorkDiarySlot` type to include `events[]`
- New `extractAppBreakdown(slots)` pure function
- New `ai_app_history` AsyncStorage cache (12 weeks, keyed by Monday)
- `useAIData` writes current-week app breakdown on every fetch
- `useHistoryBackfill` writes past-week app breakdown during backfill
- New `useAppBreakdown` hook for reading the cache
- `AppBreakdownCard` component with per-app AI vs non-AI bars
- Guidance chip generation (pure function, rule-based)
- Integration into `ai.tsx` between Daily Breakdown and Trajectory cards

### Out of Scope
- Per-day app breakdown (weekly granularity only)
- Push notifications
- Sorting/filtering controls in the UI (initial version: sorted by total slots desc)

## Architecture

```
WorkDiarySlot[].events[].processName
        │
        ▼
extractAppBreakdown(slots) → AppBreakdownEntry[]
        │
        ├─ useAIData → ai_app_history[currentWeek] (updated each fetch)
        └─ useHistoryBackfill → ai_app_history[pastWeeks] (backfilled once/session)
                │
                ▼
         useAppBreakdown → { aggregated12w, currentWeek }
                │
                ▼
      AppBreakdownCard + generateGuidance()
                │
                ▼
            ai.tsx
```

## Changelog

### Specs
| Spec | Description | Status |
|------|-------------|--------|
| 11-app-data-layer | Types, extraction logic, AsyncStorage cache, hooks | pending |
| 12-app-breakdown-ui | AppBreakdownCard, guidance chips, ai.tsx wiring | pending |
