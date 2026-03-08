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

## Files Created/Modified

```
WS/
  app/                          ← NEW: Expo app root
    CONTEXT.md                  ← project context doc
    app.json                    ← Expo config
    package.json
    app/                        ← Expo Router screens
      (auth)/
      (tabs)/
    src/
      api/                      ← Crossover API client
      hooks/                    ← React Query hooks
      store/                    ← SecureStore config
      widgets/                  ← Widget definitions
      lib/                      ← Business logic
      components/               ← Shared UI
  server/                       ← NEW: Vercel ping server
  features/app/hourglass-expo/  ← this feature
```
