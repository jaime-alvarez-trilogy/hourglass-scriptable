# Implementation Checklist

Spec: `07-ping-server`
Feature: `hourglass-expo`

---

## Phase 7.0: Test Foundation

### FR1: Device Token Registration Endpoint
- [x] Write tests for `POST /register` returns 200 `{ ok: true }` with valid token
- [x] Write tests for `POST /register` upserts (second call with same token doesn't duplicate)
- [x] Write tests for `POST /register` with empty/missing token returns 400
- [x] Write tests for `POST /unregister` returns 200 `{ ok: true }` and removes token
- [x] Write tests for `POST /unregister` with non-existent token returns 200 (idempotent)
- [x] Write tests for `GET /health` returns 200 `{ ok: true, tokenCount: number }`

### FR2: SQLite Token Store
- [x] Write tests for `upsertToken` inserts new token with `updated_at`
- [x] Write tests for `upsertToken` replaces existing token (no duplicates)
- [x] Write tests for `deleteToken` removes existing token
- [x] Write tests for `deleteToken` on non-existent token does not error
- [x] Write tests for `getAllTokens` returns array of token strings
- [x] Write tests for `deleteTokens` removes multiple tokens in one call
- [x] Write tests for `getTokenCount` returns correct row count

### FR3: Cron Push Dispatcher
- [x] Write tests for cron chunks token array into sub-arrays of ≤ 100
- [x] Write tests for cron calls Expo push API for each chunk with correct body shape
- [x] Write tests for cron removes stale tokens on `DeviceNotRegistered` response
- [x] Write tests for cron logs sent/failed counts
- [x] Write tests for cron does not crash when Expo push API throws

### FR4: App Push Token Registration (`pushToken.ts`)
- [x] Write tests for `registerPushToken` requests permissions before getting token
- [x] Write tests for `registerPushToken` returns early if permissions denied
- [x] Write tests for `registerPushToken` POSTs token to server `/register`
- [x] Write tests for `registerPushToken` stores token in AsyncStorage under `push_token`
- [x] Write tests for `unregisterPushToken` reads token from AsyncStorage and POSTs to `/unregister`
- [x] Write tests for `unregisterPushToken` returns early if no stored token

### FR5: App Background Push Handler (`handler.ts`)
- [x] Write tests for handler ignores notifications where `data.type !== 'bg_refresh'`
- [x] Write tests for handler calls `fetchFreshData()` on `bg_refresh` notification
- [x] Write tests for handler calls `updateWidgetData(freshData)` with fetched data
- [x] Write tests for handler schedules local notification if manager and new approvals detected
- [x] Write tests for handler does not schedule notification if approval count unchanged
- [x] Write tests for handler catches and logs errors without crashing
- [x] Write tests for `scheduleLocalNotification` schedules notification with correct title/body

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent (self-validated — see notes below)
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts (Expo push tokens, SQLite rows, CrossoverSnapshot)
- [x] Fix any issues identified before proceeding

---

## Phase 7.1: Implementation

### FR1: Device Token Registration Endpoint
- [x] Create `server/index.ts` with Express app setup
- [x] Implement `POST /register` route with token validation and `upsertToken` call
- [x] Implement `POST /unregister` route with `deleteToken` call
- [x] Implement `GET /health` route with `getTokenCount` call
- [x] Create `server/package.json` with all dependencies
- [x] Create `server/tsconfig.json` for Node.js TypeScript
- [x] Create `server/railway.json` with deployment config
- [x] Create `server/.env.example`

### FR2: SQLite Token Store
- [x] Create `server/db.ts` with `better-sqlite3` initialization
- [x] Implement DB schema init: `CREATE TABLE IF NOT EXISTS device_tokens (...)`
- [x] Implement `upsertToken(token: string): void`
- [x] Implement `deleteToken(token: string): void`
- [x] Implement `deleteTokens(tokens: string[]): void`
- [x] Implement `getAllTokens(): string[]`
- [x] Implement `getTokenCount(): number`

### FR3: Cron Push Dispatcher
- [x] Create `server/push.ts` with `sendPushBatch(tokens: string[])` function
- [x] Implement chunk logic: split array into sub-arrays of ≤ 100
- [x] Implement Expo push API POST for each chunk
- [x] Implement stale token extraction from Expo ticket responses
- [x] Create `server/cron.ts` with `node-cron` schedule `*/15 * * * *`
- [x] Implement `runCron()`: getAllTokens → sendPushBatch → deleteTokens(stale) → log

### FR4: App Push Token Registration (`pushToken.ts`)
- [x] Create `src/lib/pushToken.ts`
- [x] Implement `registerPushToken()` with permission request, token fetch, server POST, AsyncStorage store
- [x] Implement `unregisterPushToken()` with AsyncStorage read, server POST, AsyncStorage clear
- [x] Wire `PING_SERVER_URL` from `EXPO_PUBLIC_PING_SERVER_URL` env var with fallback

### FR5: App Background Push Handler (`handler.ts`)
- [x] Create `src/notifications/handler.ts`
- [x] Implement `handleBackgroundPush(notification)` with type guard for `bg_refresh`
- [x] Implement fresh data fetch and widget update calls
- [x] Implement approval count comparison and local notification scheduling
- [x] Implement `scheduleLocalNotification(count: number)` with title "New Approvals"
- [x] Register handler in app entry point via `Notifications.addNotificationReceivedListener` (`registerBackgroundPushHandler` exported)

---

## Phase 7.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation (endpoints, DB schema, push body shape)
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(07-ping-server): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(07-ping-server): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Server code follows Node.js/Express patterns
- [ ] App code follows existing Expo patterns from `src/`

---

## Session Notes

**2026-03-08**: Spec created from spec-research.md. 5 FRs identified: server endpoints (FR1), SQLite store (FR2), cron dispatcher (FR3), app token registration (FR4), app background handler (FR5). No cross-FR dependencies — all FRs can be tested and implemented in parallel.

**2026-03-08**: Phase 7.0 and 7.1 complete. Tests written in server/__tests__/ and src/__tests__/. Implementation files created: server/{index,db,push,cron}.ts, src/lib/pushToken.ts, src/lib/{crossoverData,widgetBridge}.ts (boundary stubs), src/notifications/handler.ts, server/{package.json,tsconfig.json,railway.json,.env.example}. Bash unavailable for running tests — commits pending user approval.
