# Hourglass Expo App

## Overview

Full React Native / Expo app replacing the Scriptable widget system. Tracks weekly hours, earnings, AI usage %, BrainLift hours, and manager approval queues for Crossover remote contractors. Runs on iOS and Android with native home screen widgets kept fresh via a silent ping server.

## Problem

The current Scriptable implementation is iOS-only, requires the Scriptable app, has no onboarding UI, and cannot be distributed to other users. It cannot scale beyond personal use.

## Solution

A production Expo app with:
- Native iOS and Android support
- Proper onboarding and auth screens
- Role-aware dashboard (contributor vs manager views)
- Native home screen widgets on both platforms
- Silent ping server keeping widget data fresh in the background

## Target Users

- Crossover contributors: track weekly hours, earnings, deadline countdown, AI% and BrainLift
- Crossover managers: all of the above + pending manual time and overtime approval queue

## Architecture

```
Crossover API
     ↓
Silent Ping Server (Vercel cron, every 15min)
     ↓ silent push
App (background fetch)
  → Crossover API calls (credentials on-device)
  → Local Store (AsyncStorage + expo-file-system)
     ↓
Widget reads local store
```

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 55, bare workflow (CNG) |
| Routing | Expo Router (file-based) |
| Server state | TanStack Query v5 (React Query) |
| Auth storage | Expo SecureStore |
| Local cache | AsyncStorage + expo-file-system |
| iOS widget | expo-widgets (SDK 55, official) |
| Android widget | react-native-android-widget |
| Ping server | Vercel serverless + cron |
| Push | Expo Push Notifications |

### Key Architectural Decisions

1. **Credentials never leave the device** — the ping server sends a wakeup signal only; all Crossover API calls happen on-device using locally stored credentials.
2. **Widget reads local store only** — widgets never call Crossover APIs directly.
3. **React Query for all API state** — handles loading, error, cache, and stale-while-revalidate automatically.
4. **Role detection on login, refreshed weekly** — `isManager` stored in config, re-checked every Monday.
5. **Expo SecureStore replaces iOS Keychain** — works on both platforms with same API.

## Spec Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-foundation | Expo project setup, folder structure, API client, SecureStore config layer, shared types | 02,03,04,05,06 | — | M |
| 02-auth-onboarding | Login screen, onboarding wizard, role detection, credential storage, settings/reconfigure | 03,04,05,06 | 01 | M |
| 03-hours-dashboard | Contributor dashboard: hours, earnings, deadline countdown, daily breakdown bar chart | 06 | 01,02 | M |
| 04-ai-brainlift | Work diary fetch, tag parsing, AI% formula, BrainLift hours, per-day cache | 06 | 01,02 | M |
| 05-manager-approvals | Pending manual time + overtime fetch, approve/reject actions, approval notifications | 06 | 01,02 | L |
| 06-widgets | iOS (expo-widgets) + Android (react-native-android-widget) home screen widgets, data bridge, timeline scheduling | — | 01,02,03,04,05 | L |
| 07-ping-server | Vercel cron function, device token registration endpoint, silent push dispatch, push token storage | — | 01,02 | S |

## Out of Scope (v1)

- Web dashboard
- Cross-device sync
- Historical data beyond current week
- Siri shortcuts (post-launch)
- Lock screen widgets (post-launch)
- Team-level analytics
- Full backend credential storage (Option A architecture)

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-08 | [01-foundation](specs/01-foundation/spec.md) | Project skeleton, API client, SecureStore/AsyncStorage config layer, shared TypeScript types |
| 2026-03-08 | [02-auth-onboarding](specs/02-auth-onboarding/spec.md) | Auth gate, 5-screen onboarding flow, fetchAndBuildConfig, useSetup/useConfig/useRoleRefresh hooks |
| 2026-03-08 | [07-ping-server](specs/07-ping-server/spec.md) | Railway ping server (Express + SQLite + node-cron), silent push dispatch, app push token registration and background handler |
| 2026-03-08 | [05-manager-approvals](specs/05-manager-approvals/spec.md) | Pending manual time + overtime fetch, approve/reject actions, optimistic updates, role-guarded approvals screen |
| 2026-03-08 | [03-hours-dashboard](specs/03-hours-dashboard/spec.md) | Contributor dashboard: hours, earnings, deadline countdown, daily bar chart, cache failover, urgency theming |
| 2026-03-08 | [04-ai-brainlift](specs/04-ai-brainlift/spec.md) | Work diary fetch, tag parsing, AI% formula, BrainLift hours, per-day AsyncStorage cache, AI tab screen |

## Files Created/Modified

```
WS/
  hourglassws/                  ← Expo app root
    app/                        ← Expo Router screens
      (auth)/
      (tabs)/
    src/
      api/                      ← Crossover API client
      hooks/                    ← React Query hooks
      store/                    ← SecureStore config
      widgets/                  ← Widget definitions
      lib/
        pushToken.ts            ← FR4: register/unregister device tokens  [07-ping-server]
        crossoverData.ts        ← Boundary stub: fetchFreshData()         [07-ping-server]
        widgetBridge.ts         ← Boundary stub: updateWidgetData()       [07-ping-server]
      notifications/
        handler.ts              ← FR5: background push handler            [07-ping-server]
      components/               ← Shared UI
    server/                     ← NEW: Railway ping server                [07-ping-server]
      index.ts                  ← FR1: Express routes /register /unregister /health
      db.ts                     ← FR2: SQLite token store (better-sqlite3)
      push.ts                   ← FR3: Expo push batch sender
      cron.ts                   ← FR3: node-cron dispatcher (*/15 * * * *)
      package.json
      tsconfig.json
      railway.json
      .env.example
    server/__tests__/
      db.test.ts
      push.test.ts
      routes.test.ts
    src/__tests__/
      lib/pushToken.test.ts
      notifications/handler.test.ts
  features/app/hourglass-expo/  ← this feature
```
