# Spec Research: 02-auth-onboarding

## Problem Context

Users need a way to log in, configure their account, and have the app detect whether they're a contributor or manager. The Scriptable version used blocking native alerts for this flow — the Expo version needs proper screens with form validation, loading states, and error feedback. The onboarding must survive being interrupted and resumed.

## Exploration Findings

### Current Onboarding Steps (hourglass.js runOnboarding)

1. Environment choice (Production / QA)
2. Email + password entry
3. Auth test → POST /api/v3/token
4. Profile + ID detection (3-strategy fallback):
   - Strategy 1: `GET /api/identity/users/current/detail` — gets everything in one call
   - Strategy 2: `GET /api/v2/teams/assignments?avatarType=CANDIDATE&status=ACTIVE&page=0`
   - Strategy 3: Manual entry alert (team ID, manager ID, user ID)
5. Hourly rate detection (auto from payments, fallback to manual)
6. Role detection: `avatarTypes.includes("MANAGER")`
7. Save credentials + config
8. Success summary

### Identity Detail API Response (most important endpoint)

`GET /api/identity/users/current/detail`

Fields used:
```javascript
{
  fullName: string,
  avatarTypes: string[],           // includes "MANAGER" for managers
  assignment: {
    id: number,                    // → assignmentId (work diary)
    salary: number,                // → hourlyRate
    weeklyLimit: number,           // → weeklyLimit (default 40)
    team: { id: number },          // → primaryTeamId
    manager: { id: number },       // → managerId
    selection: {
      marketplaceMember: {
        application: {
          candidate: { id: number } // → userId (timesheet)
        }
      }
    }
  },
  userAvatars: [
    { avatarType: "CANDIDATE", id: number }  // alternative userId source
  ]
}
```

### Payments API for Rate Detection

`GET /api/v3/users/current/payments?from=YYYY-MM-DD&to=YYYY-MM-DD`

Used during onboarding to auto-detect hourly rate from recent payment history (3-month window). Falls back to manual entry.

### Role Refresh (weekly)

Runs on Mondays:
- Re-fetches `GET /api/identity/users/current/detail`
- Updates: `isManager`, `hourlyRate`, `weeklyLimit`, `teams`
- Writes updated fields via `updateConfigField()`

### Backward Compatibility

Existing configs without `isManager` should default to `true` (manager). New onboarding always explicitly sets it.

## Key Decisions

### Decision 1: Multi-step screen flow (not alerts)
- Each onboarding step is a screen (or step within one screen using state machine)
- Steps: Welcome → Credentials → Verifying → Profile Setup → Success
- Progress indicator shows current step
- Rationale: proper UX, error recovery per step, no blocking alerts

### Decision 2: Auth gate in root layout
- `app/_layout.tsx` checks `setupComplete` from config
- If false → redirect to `/(auth)/welcome`
- If true → proceed to `/(tabs)/`
- Rationale: clean separation, handles app restarts correctly

### Decision 3: Strategy 1 only with clear error
- Only attempt `GET /api/identity/users/current/detail`
- If it fails, show manual entry form (skip Strategy 2 complexity)
- Rationale: Strategy 1 works for all known accounts; Strategy 2 is complex fallback that added bugs

### Decision 4: Role refresh via React Query background refetch
- `useRoleRefresh` hook checks `lastRoleCheck` on app foreground
- If Monday and >7 days since last check → re-fetches detail endpoint
- Updates config fields, invalidates relevant queries
- Rationale: replaces Scriptable's `weeklyRefresh()` with proper lifecycle management

## Interface Contracts

### Screens

```
app/(auth)/
  _layout.tsx          — Stack navigator for auth flow
  welcome.tsx          — Environment choice + "Get Started" CTA
  credentials.tsx      — Email + password form
  verifying.tsx        — Loading screen while auth + profile fetch runs
  setup.tsx            — Manual fallback: rate entry if auto-detect fails
  success.tsx          — "You're all set" screen with config summary
```

### Hooks

```typescript
// src/hooks/useAuth.ts

function useSetup(): {
  step: 'welcome' | 'credentials' | 'verifying' | 'setup' | 'success'
  setEnvironment: (useQA: boolean) => void
  submitCredentials: (username: string, password: string) => Promise<void>
  // Throws: AuthError (bad credentials), NetworkError
  // On success: fetches profile, detects role, saves config, navigates to success
  submitRate: (rate: number) => Promise<void>
  // Used only if auto-detect fails
  isLoading: boolean
  error: string | null
}

function useRoleRefresh(): void
// Called from app root on foreground
// Checks lastRoleCheck, runs weekly refresh on Mondays
// Updates config silently (no UI)

function useConfig(): {
  config: CrossoverConfig | null
  isLoading: boolean
  refetch: () => void
}
// React Query wrapper for config load — used by all screens
```

### Profile Fetch Logic (internal to useSetup)

```typescript
async function fetchAndBuildConfig(
  username: string,
  password: string,
  useQA: boolean
): Promise<CrossoverConfig>
// 1. getAuthToken(username, password, useQA)
// 2. GET /api/identity/users/current/detail
// 3. Extract all IDs (see Critical ID Mapping)
// 4. GET /api/v3/users/current/payments (auto-detect rate, fallback 0)
// 5. Build + return CrossoverConfig
// Throws: AuthError, NetworkError, ProfileError
```

### Sources for Config Fields

| Field | Source |
|-------|--------|
| `userId` | `detail.userAvatars.find(a => a.avatarType === 'CANDIDATE').id` OR `detail.assignment.selection.marketplaceMember.application.candidate.id` |
| `fullName` | `detail.fullName` |
| `managerId` | `detail.assignment.manager.id` |
| `primaryTeamId` | `detail.assignment.team.id` |
| `assignmentId` | `detail.assignment.id` |
| `hourlyRate` | `detail.assignment.salary` (or payments history) |
| `weeklyLimit` | `detail.assignment.weeklyLimit` (default 40) |
| `isManager` | `detail.avatarTypes.includes('MANAGER')` |
| `teams` | `[{ id: detail.assignment.team.id, name: detail.assignment.team.name }]` |
| `useQA` | User selection on welcome screen |
| `lastRoleCheck` | `new Date().toISOString()` |
| `setupComplete` | `true` |
| `setupDate` | `new Date().toISOString()` |

## Test Plan

### useSetup — credentials submission

**Happy Path:**
- [ ] Calls `getAuthToken` with submitted credentials
- [ ] Fetches detail endpoint with returned token
- [ ] Extracts all config fields correctly
- [ ] Saves credentials to SecureStore
- [ ] Saves config to AsyncStorage
- [ ] Sets `setupComplete: true`

**Error Cases:**
- [ ] Bad credentials → `AuthError` → shows "Invalid email or password"
- [ ] Network failure → `NetworkError` → shows retry option
- [ ] Detail endpoint 403 → shows manual entry fallback

**Mocks:** `getAuthToken`, `apiGet`, SecureStore, AsyncStorage

### fetchAndBuildConfig — ID extraction

- [ ] Extracts `userId` from `userAvatars[CANDIDATE]` path
- [ ] Falls back to nested `candidate.id` path if userAvatars missing
- [ ] Sets `isManager: true` when avatarTypes includes "MANAGER"
- [ ] Sets `isManager: false` when avatarTypes does not include "MANAGER"
- [ ] Uses `assignment.salary` for hourlyRate
- [ ] Defaults `weeklyLimit` to 40 if not in response

### useRoleRefresh

- [ ] Does NOT run if today is not Monday
- [ ] Does NOT run if `lastRoleCheck` was within last 7 days
- [ ] Runs on Monday if `lastRoleCheck` is >7 days ago
- [ ] Updates `isManager` from fresh detail response
- [ ] Updates `lastRoleCheck` timestamp after successful refresh

### Auth gate

- [ ] Redirects to `/(auth)/welcome` if `setupComplete` is false/null
- [ ] Renders tabs if `setupComplete` is true
- [ ] Handles async config load with loading state

## Files to Create

```
app/app/(auth)/
  _layout.tsx
  welcome.tsx
  credentials.tsx
  verifying.tsx
  setup.tsx
  success.tsx

src/
  hooks/
    useAuth.ts
    useRoleRefresh.ts
    useConfig.ts
  api/
    auth.ts             — fetchAndBuildConfig, getProfileDetail
```

## Files to Reference

- `WS/hourglass.js` — `runOnboarding()`, `weeklyRefresh()`, `getAuthToken()`
- `WS/tools/crossover-setup.js` — full onboarding wizard logic
- `WS/memory/MEMORY.md` — Critical ID Mapping, User Detail endpoint schema
