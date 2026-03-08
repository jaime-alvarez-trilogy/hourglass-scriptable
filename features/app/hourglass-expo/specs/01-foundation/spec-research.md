# Spec Research: 01-foundation

## Problem Context

Before any screen can be built, the Expo project needs a working skeleton: folder structure, native build config, a typed API client that all hooks will use, a SecureStore-backed config layer replacing the Scriptable Keychain + JSON file system, and shared TypeScript types mirroring the Crossover API response shapes.

This spec is the dependency for everything else. It produces no visible UI — only the infrastructure every other spec builds on.

## Exploration Findings

### Current Scriptable Config System (to port)

**Credentials (Keychain):**
- Keys: `crossover_username`, `crossover_password`
- Expo replacement: `expo-secure-store` — `SecureStore.setItemAsync(key, value)`

**Settings (crossover-config.json):**
```javascript
{
  userId: string,          // candidate avatar ID — for timesheet API
  fullName: string,
  managerId: string,
  primaryTeamId: string,
  teams: [{id, name, company}],
  hourlyRate: number,
  weeklyLimit: number,     // default 40
  useQA: boolean,
  isManager: boolean,
  assignmentId: string,    // for work diary API
  lastRoleCheck: ISO,      // weekly Monday refresh
  debugMode: boolean,
  setupComplete: boolean,
  setupDate: ISO
}
```
Expo replacement: AsyncStorage with JSON serialization.

### Current Auth Flow (to port)

```
POST /api/v3/token
  Authorization: Basic base64(email:password)
  → token string (format: "userId:sessionToken" — split on ":" for parts)
  → x-auth-token header on all subsequent requests
```

All API requests use `x-auth-token: <token>` header. Token is short-lived — fetched fresh on each data load.

### API Base URLs
- Production: `https://api.crossover.com`
- QA: `https://api-qa.crossover.com`
- Toggled by `useQA` config field

### Critical ID Mapping (must be preserved exactly)

| Variable | Source | Used For |
|----------|--------|----------|
| `userId` (from token split) | `token.split(':')[0]` | Login only, NOT for API queries |
| `config.userId` | `userAvatars[CANDIDATE].id` OR `assignment.selection...candidate.id` | Timesheet API `userId` param |
| `config.assignmentId` | `assignment.id` | Work diary API `assignmentId` param |
| `config.managerId` | `assignment.manager.id` | Timesheet API `managerId` param |
| `config.primaryTeamId` | `assignment.team.id` | Timesheet API `teamId` param |

Mixing these IDs is the #1 source of bugs in the existing codebase.

### Existing API Patterns

All endpoints return JSON. Common patterns:
- Auth errors: `401` / `403` status codes
- Timesheet: tries 3 URL strategies (full params → manager+user → user only)
- All dates: `YYYY-MM-DD` format
- Payments API: UTC weeks (use `Date.UTC()`, never `toISOString()` for local dates)

## Key Decisions

### Decision 1: SecureStore for credentials, AsyncStorage for config
- SecureStore: encrypted, hardware-backed on both platforms — for email/password only
- AsyncStorage: JSON config (non-sensitive settings) — faster reads, no encryption overhead
- Rationale: matches Scriptable pattern (Keychain for credentials, JSON file for settings)

### Decision 2: Centralized API client with token refresh
- Single `apiClient` function wraps all fetch calls
- Automatically fetches fresh token before each call (matches Scriptable behavior)
- Throws typed errors for 401/403/network failures
- Rationale: DRY, consistent error handling across all hooks

### Decision 3: TypeScript strict mode
- All API response shapes typed from MEMORY.md documentation
- Rationale: prevents the ID-mixing bugs that exist in the Scriptable version

### Decision 4: Expo CNG (Continuous Native Generation)
- Use `app.json` config + Expo config plugins — no manual `ios/` or `android/` folders committed
- Regenerate native projects via `npx expo prebuild`
- Rationale: cleaner repo, easier upgrades, required by expo-widgets plugin

### Decision 5: Environment config at build time
- `useQA` toggled in stored config, not a build flag
- API_BASE derived from config at runtime: `getApiBase(config.useQA)`
- Rationale: allows switching environments without rebuild (matches existing behavior)

## Interface Contracts

### Config Types
```typescript
interface CrossoverConfig {
  // Stored in AsyncStorage
  userId: string;           // ← config.json: userAvatars[CANDIDATE].id
  fullName: string;         // ← API: identity/users/current/detail.fullName
  managerId: string;        // ← API: assignment.manager.id
  primaryTeamId: string;    // ← API: assignment.team.id
  teams: Team[];            // ← API: v2/teams/assignments
  hourlyRate: number;       // ← API: assignment.salary
  weeklyLimit: number;      // ← API: assignment.weeklyLimit (default 40)
  useQA: boolean;           // ← user choice at onboarding
  isManager: boolean;       // ← API: avatarTypes.includes("MANAGER")
  assignmentId: string;     // ← API: assignment.id
  lastRoleCheck: string;    // ← ISO timestamp, refreshed weekly Mon
  debugMode: boolean;       // ← user toggle
  setupComplete: boolean;   // ← set true after onboarding
  setupDate: string;        // ← ISO timestamp
}

interface Team {
  id: string;               // ← API: team.id
  name: string;             // ← API: team.name
  company: string;          // ← API: team.company.name
}

// Credentials stored separately in SecureStore
interface Credentials {
  username: string;         // ← SecureStore key: 'crossover_username'
  password: string;         // ← SecureStore key: 'crossover_password'
}
```

### API Client
```typescript
// src/api/client.ts

async function getAuthToken(username: string, password: string, useQA: boolean): Promise<string>
// POST /api/v3/token, Basic auth
// Returns: raw token string
// Throws: AuthError on 401, NetworkError on fetch failure

async function apiGet<T>(path: string, params: Record<string, string>, token: string, useQA: boolean): Promise<T>
// GET request with x-auth-token header
// Throws: AuthError on 401/403, ApiError on other failures

async function apiPut<T>(path: string, body: unknown, token: string, useQA: boolean): Promise<T>
// PUT request with x-auth-token header + JSON body
```

### Config Layer
```typescript
// src/store/config.ts

async function loadConfig(): Promise<CrossoverConfig | null>
// Reads AsyncStorage 'crossover_config' key, parses JSON
// Returns null if not set

async function saveConfig(config: CrossoverConfig): Promise<void>
// Serializes + writes to AsyncStorage

async function loadCredentials(): Promise<Credentials | null>
// Reads SecureStore crossover_username + crossover_password
// Returns null if either missing

async function saveCredentials(username: string, password: string): Promise<void>
// Writes both keys to SecureStore

async function clearAll(): Promise<void>
// Removes both AsyncStorage config + SecureStore credentials

function getApiBase(useQA: boolean): string
// Returns 'https://api-qa.crossover.com' or 'https://api.crossover.com'

function getAppBase(useQA: boolean): string
// Returns 'https://app-qa.crossover.com' or 'https://app.crossover.com'
```

### Error Types
```typescript
class AuthError extends Error { statusCode: 401 | 403 }
class NetworkError extends Error { }
class ApiError extends Error { statusCode: number }
```

## Test Plan

### getAuthToken
**Signature:** `getAuthToken(username, password, useQA) → Promise<string>`

**Happy Path:**
- [ ] Returns token string when credentials valid (200 response)
- [ ] Uses Basic auth header: `base64(username:password)`
- [ ] Hits QA base when `useQA=true`, prod when false

**Error Cases:**
- [ ] Throws `AuthError` on 401 response
- [ ] Throws `NetworkError` on fetch rejection

**Mocks:** `fetch` — mock 200 with token body, 401 response

### loadConfig / saveConfig
- [ ] `saveConfig` serializes and writes to AsyncStorage
- [ ] `loadConfig` parses and returns typed object
- [ ] `loadConfig` returns null when key absent
- [ ] Round-trip: save then load returns same object

### loadCredentials / saveCredentials
- [ ] `saveCredentials` writes both SecureStore keys
- [ ] `loadCredentials` returns null if either key missing
- [ ] `loadCredentials` returns both values when both present

### clearAll
- [ ] Removes AsyncStorage key
- [ ] Removes both SecureStore keys
- [ ] Subsequent loadConfig returns null
- [ ] Subsequent loadCredentials returns null

### apiGet
- [ ] Attaches `x-auth-token` header
- [ ] Serializes params as query string
- [ ] Throws `AuthError` on 401/403
- [ ] Throws `ApiError` on 500

**Mocks:** `fetch`

## Files to Create

```
app/
  app.json                    — Expo SDK 55, bundle ID, plugins config
  package.json                — expo, expo-router, @tanstack/react-query,
                                expo-secure-store, @react-native-async-storage/async-storage
  tsconfig.json               — strict mode
  src/
    api/
      client.ts               — getAuthToken, apiGet, apiPut
      errors.ts               — AuthError, NetworkError, ApiError
    store/
      config.ts               — loadConfig, saveConfig, loadCredentials,
                                saveCredentials, clearAll, getApiBase, getAppBase
    types/
      config.ts               — CrossoverConfig, Credentials, Team
      api.ts                  — shared API response types (populated in later specs)
  app/
    _layout.tsx               — Root layout, QueryClientProvider, auth gate
    +not-found.tsx
```

## Files to Reference

- `WS/hourglass.js` lines 1–150 — config loading, initUrls, getAuthToken
- `WS/tools/crossover-setup.js` — loadConfig, saveConfig, getApiBase patterns
- `WS/memory/MEMORY.md` — Critical ID Mapping section
