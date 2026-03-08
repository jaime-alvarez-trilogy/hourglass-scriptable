# Implementation Checklist

Spec: `01-foundation`
Feature: `hourglass-expo`

---

## Phase 1.0: Test Foundation

### FR2: Error Types
- [x] Write test: `new AuthError(401)` is `instanceof Error` and `instanceof AuthError`
- [x] Write test: `authError.statusCode` equals 401 (and 403 variant)
- [x] Write test: `new NetworkError('timeout')` is `instanceof Error` and `instanceof NetworkError`
- [x] Write test: `new ApiError(500)` is `instanceof Error`; `apiError.statusCode === 500`

### FR3: Auth Token Fetch
- [x] Write test: returns token string on mocked 200 response
- [x] Write test: outgoing request uses `Authorization: Basic base64(user:pass)` header
- [x] Write test: outgoing request method is POST
- [x] Write test: throws `AuthError(401)` on 401 response
- [x] Write test: throws `AuthError(403)` on 403 response
- [x] Write test: throws `NetworkError` when fetch rejects
- [x] Write test: uses QA base URL when `useQA === true`
- [x] Write test: uses prod base URL when `useQA === false`

### FR4: API Client — GET
- [x] Write test: outgoing request includes `x-auth-token` header with correct value
- [x] Write test: query params serialized correctly into URL
- [x] Write test: empty params → no `?` in URL
- [x] Write test: throws `AuthError(401)` on 401 response
- [x] Write test: throws `AuthError(403)` on 403 response
- [x] Write test: throws `ApiError(500)` on 500 response
- [x] Write test: request method is GET

### FR5: API Client — PUT
- [x] Write test: outgoing request method is PUT
- [x] Write test: `x-auth-token` header present
- [x] Write test: `Content-Type: application/json` header present
- [x] Write test: body serialized as JSON string
- [x] Write test: throws `AuthError(403)` on 403 response
- [x] Write test: throws `ApiError(422)` on 422 response

### FR7: Config Layer — AsyncStorage
- [x] Write test: `loadConfig()` returns `null` when key absent
- [x] Write test: `loadConfig()` returns typed object when key present
- [x] Write test: round-trip (`saveConfig` then `loadConfig`) returns deeply equal object
- [x] Write test: `loadConfig()` returns `null` on invalid JSON (not throw)
- [x] Write test: `saveConfig` writes to key `'crossover_config'`
- [x] Write test: `saveConfig` propagates AsyncStorage errors (does not swallow)

### FR8: Credentials Layer — SecureStore
- [x] Write test: `saveCredentials` writes both SecureStore keys
- [x] Write test: `loadCredentials()` returns `null` when username key absent
- [x] Write test: `loadCredentials()` returns `null` when password key absent
- [x] Write test: `loadCredentials()` returns `Credentials` object when both keys present

### FR9: Clear All
- [x] Write test: after `clearAll()`, `loadConfig()` returns `null`
- [x] Write test: after `clearAll()`, `loadCredentials()` returns `null`
- [x] Write test: `AsyncStorage.removeItem('crossover_config')` called
- [x] Write test: `SecureStore.deleteItemAsync('crossover_username')` called
- [x] Write test: `SecureStore.deleteItemAsync('crossover_password')` called
- [x] Write test: `clearAll` propagates errors (does not swallow)

### FR10: Environment URLs
- [x] Write test: `getApiBase(false)` returns `"https://api.crossover.com"`
- [x] Write test: `getApiBase(true)` returns `"https://api-qa.crossover.com"`
- [x] Write test: `getAppBase(false)` returns `"https://app.crossover.com"`
- [x] Write test: `getAppBase(true)` returns `"https://app-qa.crossover.com"`

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Project Structure
- [x] Create `hourglassws/app.json` — Expo SDK 54 (pre-existing), EAS project ID `4ad8a6bd-aec2-45a5-935f-5598d47b605d`
- [x] Create `hourglassws/package.json` — all required dependencies (pre-existing)
- [x] Create `hourglassws/tsconfig.json` — `"strict": true`
- [x] Add `ios/` and `android/` to `.gitignore`
- [x] Verify `npx expo start` launches without crash ✓ (simulator screenshot captured)

### FR12: Test Infrastructure
- [x] Create `hourglassws/jest.config.js` — `jest-expo/node` preset
- [x] Create `hourglassws/__mocks__/expo-secure-store.ts` — in-memory mock with state reset
- [x] Create `hourglassws/__mocks__/@react-native-async-storage/async-storage.ts` — in-memory mock with state reset
- [x] Verify `npx jest` runs without configuration errors (54 tests pass)

### FR2: Error Types
- [x] Create `src/api/errors.ts` — `AuthError`, `NetworkError`, `ApiError` classes
- [x] `AuthError.statusCode` typed as `401 | 403`
- [x] `ApiError.statusCode` typed as `number`

### FR3: Auth Token Fetch
- [x] Implement `getAuthToken` in `src/api/client.ts`
- [x] Basic auth header construction: `"Basic " + btoa(username + ":" + password)`
- [x] POST to `/api/v3/token`; return `response.text()`
- [x] Map 401 → `AuthError(401)`, 403 → `AuthError(403)`, fetch rejection → `NetworkError`

### FR4: API Client — GET
- [x] Implement `apiGet<T>` in `src/api/client.ts`
- [x] `URLSearchParams` for query string; omit `?` when empty params
- [x] `x-auth-token` header; JSON parse response
- [x] Map 401/403 → `AuthError`, other non-2xx → `ApiError(statusCode)`

### FR5: API Client — PUT
- [x] Implement `apiPut<T>` in `src/api/client.ts`
- [x] `Content-Type: application/json`; `JSON.stringify(body)` as request body
- [x] Same error mapping as `apiGet`

### FR6: Config Types
- [x] Create `src/types/config.ts` — `CrossoverConfig` (14 fields), `Team`, `Credentials`
- [x] Create `src/types/api.ts` — empty export (populated by later specs)
- [x] Verify `tsc --noEmit` passes ✓

### FR7: Config Layer — AsyncStorage
- [x] Implement `loadConfig` / `saveConfig` in `src/store/config.ts`
- [x] `loadConfig`: wrap `JSON.parse` in try/catch → return `null` on error
- [x] `saveConfig`: `AsyncStorage.setItem('crossover_config', JSON.stringify(config))`

### FR8: Credentials Layer — SecureStore
- [x] Implement `loadCredentials` / `saveCredentials` in `src/store/config.ts`
- [x] `loadCredentials`: read both keys; return `null` if either is `null`

### FR9: Clear All
- [x] Implement `clearAll` in `src/store/config.ts`
- [x] `Promise.all([AsyncStorage.removeItem(...), SecureStore.deleteItemAsync(...), SecureStore.deleteItemAsync(...)])`

### FR10: Environment URLs
- [x] Implement `getApiBase` / `getAppBase` in `src/store/config.ts`

### FR11: Root Layout
- [x] `app/_layout.tsx` — `QueryClient` outside component, `QueryClientProvider` wrapping `<Stack />` (pre-existing, verified)
- [x] Create `app/+not-found.tsx` — minimal 404 screen

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] HIGH issues fixed: `btoa()` replaces `Buffer.from()`, `+not-found.tsx` created

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(01-foundation): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-foundation): strengthen test assertions`

### Step 4: Simulator Smoke Test
- [x] Run `npx expo start` and launch on iOS Simulator
- [x] App launches without crash (no red screen) ✓ Hourglass splash + app loaded on iPhone 17 Pro
- [x] Root layout renders (no "QueryClient not found" error in logs) ✓
- [x] Capture screenshot confirming startup state ✓

### Final Verification
- [x] All tests passing (`npx jest`) — 54/54
- [x] `tsc --noEmit` passes with zero errors
- [ ] `npx expo prebuild` completes without errors
- [ ] No regressions in existing tests

---

## Session Notes

**2026-03-08**: Spec created. Jest/test infrastructure assigned to FR12 (was ⚠️ Unassigned in draft).

**2026-03-08**: Implementation complete.
- Phase 1.0: 1 test commit (test(FR2-FR10)) — 54 tests, all red initially
- Phase 1.1: 1 implementation commit (feat(FR2-FR12)) — all 54 green
- Phase 1.2: 1 fix commit (fix(01-foundation)) — btoa, +not-found, tsc clean
- Simulator smoke test: PASSED — app loaded on iPhone 17 Pro, no crash
- Known deviations: SDK 54 (not 55, pre-existing); bundle ID uses jalvarez0907 (pre-existing EAS setup)
- Simulator note: visual testing added to workflow per user requirement — screenshots captured for each spec
