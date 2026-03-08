# Hourglass — Expo App

This folder contains the Expo mobile app, which replaces the Scriptable widget system.

## What This App Does

Hourglass is a productivity tracker for Crossover remote contractors. It shows:
- Weekly hours worked + daily breakdown
- Earnings (weekly + today)
- AI usage % and BrainLift hours (from work diary tags)
- Deadline countdown (Sunday 23:59:59 UTC)
- Manager: pending manual time and overtime approval queue

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Expo SDK 55 (bare workflow / CNG) | Latest stable, widget support |
| Routing | Expo Router (file-based) | Standard for Expo apps 2025+ |
| Server state | React Query (TanStack Query v5) | Caching, loading states, auto-refresh |
| Auth storage | Expo SecureStore | Keychain (iOS) / Keystore (Android) |
| Local storage | expo-file-system + AsyncStorage | Cache files (AI, hours, approvals) |
| iOS widgets | expo-widgets (SDK 55, official alpha) | JSX → SwiftUI, no Swift required |
| Android widgets | react-native-android-widget | Stable, 41+ releases, best Android option |
| Styling | NativeWind (Tailwind for RN) or StyleSheet | TBD at spec time |

## Key Architecture Decisions

- **No Expo Go** — both widget libraries require development builds (EAS Build)
- **iOS widgets** use `updateTimeline()` with pre-scheduled entries (15–30 min intervals)
- **Android widgets** via task handler reading AsyncStorage
- **Credentials** stored in Expo SecureStore (replaces iOS Keychain direct access)
- **Config** stored in AsyncStorage as JSON (replaces crossover-config.json)
- **Roles** auto-detected on login, refreshed weekly on Mondays

## API Layer (Unchanged from Scriptable)

All Crossover API endpoints remain the same. See `../memory/MEMORY.md` for full docs.

Critical ID mapping:
- `userAvatars[CANDIDATE].id` → userId for timesheet API
- `assignment.id` → assignmentId for work diary API
- `assignment.manager.id` → managerId
- `assignment.team.id` → teamId

## Folder Structure (Planned)

```
app/
  app.json              — Expo config
  package.json
  app/                  — Expo Router screens
    (auth)/             — Onboarding / login screens
    (tabs)/             — Main tabbed app
      index.tsx         — Hours dashboard
      approvals.tsx     — Manager approval queue
      ai.tsx            — AI% + BrainLift view
      settings.tsx      — Config / reconfigure
  src/
    api/                — All Crossover API calls
    hooks/              — React Query hooks
    store/              — Auth state (SecureStore)
    widgets/            — Widget definitions (expo-widgets + android)
    lib/                — Business logic (hours calc, AI%, deadline)
    components/         — Shared UI components
```

## Migration from Scriptable

The Scriptable widget files (`../hourglass.js`, `../crossover-widget.js`) remain in the
parent directory as reference. Business logic is being ported directly — the API layer,
calculation formulas, and data structures are preserved exactly.

See `../CLAUDE.md` and `../memory/MEMORY.md` for full project context.
