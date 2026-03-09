# 07-ping-server

**Status:** Draft
**Created:** 2026-03-08
**Last Updated:** 2026-03-08
**Owner:** @trilogy

---

## Overview

### What Is Being Built

The ping server is a minimal Node.js backend deployed on Railway that keeps Hourglass widget data fresh without any knowledge of user credentials or Crossover data. It has one job: send a silent push notification to every registered device every 15 minutes, waking the app in the background so it can fetch the latest Crossover data on-device and update the home screen widget.

The app side has two parts: a push token registration module (`pushToken.ts`) that registers/unregisters device tokens with the server, and a background push handler (`handler.ts`) that responds to incoming silent pushes by fetching fresh data and refreshing the widget.

### How It Works

```
Every 15 minutes:
Railway cron (node-cron)
  → SELECT all tokens from SQLite DB
  → Chunk into arrays of 100
  → POST to Expo Push API (batch)
       ↓ silent push (content-available: 1)
  App receives push in background
  → handleBackgroundPush()
  → fetch Crossover API (on-device credentials)
  → updateWidgetData()
  → schedule local notification (if new approvals)
```

Device registration flow:
```
App launches / user logs in
  → registerPushToken()
  → Request notification permissions
  → getExpoPushTokenAsync()
  → POST /register { token }
  → Store token in AsyncStorage

User logs out
  → unregisterPushToken()
  → POST /unregister { token }
  → Clear token from AsyncStorage
```

### Key Design Decisions (from spec-research.md)

1. **Railway over Vercel**: Vercel requires Pro ($20/month) for sub-hourly cron; Railway free tier supports persistent Node.js with `node-cron`.
2. **Expo Push Service**: Handles APNs + FCM with one API — no certificate management.
3. **No auth on /register (v1)**: Tokens without valid Crossover credentials do nothing; acceptable risk for v1 simplicity.
4. **Batch sends in chunks of 100**: Respects Expo push API limits and reduces call count.
5. **Privacy-first**: Server stores only `{ token, updatedAt }` — no user identity, no credentials.

---

## Out of Scope

1. **Authentication on /register endpoint** — Descoped. Any device can register a token. Tokens without valid on-device Crossover credentials result in wasted pushes but no data exposure. Auth will be added post-launch if abuse is observed.

2. **Push delivery confirmation / analytics** — Descoped. Stale token cleanup (DeviceNotRegistered errors) provides sufficient hygiene. No delivery receipts or analytics dashboard.

3. **Per-user push scheduling** — Descoped. All devices receive pushes on the same 15-minute interval. User-configurable intervals are post-launch.

4. **Crossover API calls from the server** — Descoped by architecture. The server is intentionally stateless with respect to Crossover — it never touches user data or credentials. This is a hard architectural constraint.

5. **Web dashboard for token management** — Descoped. Admin visibility into token count is available via `GET /health`. No full admin UI for v1.

6. **Push notification content (alerts, sounds)** — Descoped. These are silent pushes only (`_contentAvailable: true`, no alert/sound). Local notifications for new approvals are scheduled by the app side (handler.ts), not the server.

7. **Multi-server / horizontal scaling** — Deferred to post-launch. Single Railway instance with SQLite is sufficient for 500 users.

8. **Token refresh / rotation** — Deferred to post-launch. Expo push tokens are stable; stale token cleanup on DeviceNotRegistered is sufficient for v1.

9. **Android background handling via react-native-android-widget task handler** — Deferred to `06-widgets`. The handler.ts notification handler triggers widget refresh, but the actual Android widget update mechanism is owned by spec 06-widgets.

---

## Functional Requirements

### FR1: Device Token Registration Endpoint

The server exposes `POST /register` and `POST /unregister` endpoints, and a `GET /health` endpoint.

**Success Criteria:**
- `POST /register` with `{ token: "ExponentPushToken[xxx]" }` responds `200 { ok: true }` and upserts the token in the DB with `updatedAt = now()`
- A second `POST /register` with the same token does not create a duplicate row (upsert, not insert)
- `POST /register` with empty or missing token responds `400 { error: "token required" }`
- `POST /unregister` with a valid token responds `200 { ok: true }` and deletes the token from DB
- `POST /unregister` with a token that doesn't exist responds `200 { ok: true }` (idempotent)
- `GET /health` responds `200 { ok: true, tokenCount: <number> }`

---

### FR2: SQLite Token Store

The server uses a local SQLite database (via `better-sqlite3`) to persist device tokens.

**Success Criteria:**
- DB is initialized with schema on server start: `CREATE TABLE IF NOT EXISTS device_tokens (token TEXT PRIMARY KEY, updated_at TEXT NOT NULL)`
- `upsertToken(token)` inserts or replaces a row with `updated_at = new Date().toISOString()`
- `deleteToken(token)` removes the row; no error if row doesn't exist
- `getAllTokens()` returns an array of all token strings
- `deleteTokens(tokens[])` removes multiple tokens in a single operation (for stale token cleanup)
- `getTokenCount()` returns the count of rows

---

### FR3: Cron Push Dispatcher

A `node-cron` task runs every 15 minutes, fetches all tokens, sends silent pushes to each in batches of 100.

**Success Criteria:**
- Cron schedule is `*/15 * * * *` (every 15 minutes)
- Fetches all tokens from DB via `getAllTokens()`
- Chunks token array into sub-arrays of ≤ 100 items
- For each chunk, POSTs to `https://exp.host/--/api/v2/push/send` with body: array of `{ to, data: { type: 'bg_refresh' }, _contentAvailable: true }`
- Logs total tokens dispatched and success/error counts
- Extracts `DeviceNotRegistered` ticket errors from Expo response and calls `deleteTokens()` for stale tokens
- Does not crash the server if Expo push API is temporarily unavailable (caught error, logged)

---

### FR4: App Push Token Registration (`pushToken.ts`)

Client-side module in the Expo app that registers/unregisters device tokens with the ping server.

**Success Criteria:**
- `registerPushToken()` requests notification permissions via `Notifications.requestPermissionsAsync()`
- If permissions not granted, `registerPushToken()` returns early without error
- Gets Expo push token via `Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })`
- POSTs token to `PING_SERVER_URL + /register`
- Stores token string in AsyncStorage under key `push_token`
- `unregisterPushToken()` reads token from AsyncStorage
- If no stored token, returns early without error
- POSTs token to `PING_SERVER_URL + /unregister`
- Removes `push_token` key from AsyncStorage

---

### FR5: App Background Push Handler (`handler.ts`)

Client-side module that processes incoming silent push notifications and refreshes widget data.

**Success Criteria:**
- Handler is registered via `Notifications.addNotificationReceivedListener`
- Ignores notifications where `notification.request.content.data.type !== 'bg_refresh'`
- On `bg_refresh`: calls `fetchFreshData()` (which fetches Crossover API using on-device credentials)
- Calls `updateWidgetData(freshData)` with the result
- If user is a manager and `freshData.pendingApprovals.length > previousCount`: calls `scheduleLocalNotification()` with approval count
- `scheduleLocalNotification(count)` schedules an immediate local notification: title "New Approvals", body `${count} item(s) pending approval`
- Handles errors gracefully: any failure in the refresh chain is caught and logged, handler does not crash

---

## Technical Design

### Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglass.js` — `checkAndNotify()`, `scheduleDeadlineReminders()`: notification scheduling patterns to adapt for `scheduleLocalNotification()`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/` — existing app structure for consistent module placement
- Expo Push Notifications docs: https://docs.expo.dev/push-notifications/overview/
- `better-sqlite3` docs for synchronous SQLite API

### Files to Create

```
hourglassws/
  server/
    index.ts          — Express app: registers /register, /unregister, /health routes; starts server
    db.ts             — better-sqlite3 init + CRUD: upsertToken, deleteToken, deleteTokens,
                        getAllTokens, getTokenCount
    push.ts           — sendPushBatch(tokens[]): chunks into arrays of 100, POSTs to Expo push API,
                        returns { sent, failed, staleTokens[] }
    cron.ts           — node-cron task: getAllTokens → sendPushBatch → deleteTokens(stale) → log
    package.json      — dependencies: express, better-sqlite3, node-cron, node-fetch (or axios)
    tsconfig.json     — TypeScript config for Node.js
    railway.json      — { "$schema": "...", "build": { "builder": "NIXPACKS" },
                          "deploy": { "startCommand": "node dist/index.js" } }
    .env.example      — PING_SERVER_PORT=3000  (no secrets needed for v1)

  src/
    lib/
      pushToken.ts    — registerPushToken(), unregisterPushToken()
                        Uses: expo-notifications, AsyncStorage, Constants
    notifications/
      handler.ts      — handleBackgroundPush(), scheduleLocalNotification()
                        Uses: expo-notifications, updateWidgetData (from 06-widgets boundary)
```

### Data Flow

**Registration:**
```
App (expo-notifications.getExpoPushTokenAsync)
  → POST https://[railway-url]/register { token }
  → server/index.ts route handler
  → db.ts upsertToken(token)
  → SQLite: INSERT OR REPLACE INTO device_tokens VALUES (?, ?)
  ← 200 { ok: true }
  → AsyncStorage.setItem('push_token', token)
```

**Cron dispatch:**
```
node-cron (*/15 * * * *)
  → cron.ts runCron()
  → db.ts getAllTokens()  ← SELECT token FROM device_tokens
  → push.ts sendPushBatch(tokens)
    → chunk into [tokens[0..99], tokens[100..199], ...]
    → fetch POST https://exp.host/--/api/v2/push/send
       body: [{ to, data: { type: 'bg_refresh' }, _contentAvailable: true }, ...]
    → parse tickets for DeviceNotRegistered errors
  → db.ts deleteTokens(staleTokens)
  → console.log(`Pushed ${sent}/${total}, removed ${stale} stale tokens`)
```

**Background wake:**
```
iOS/Android receives silent push (content-available: 1)
  → App wakes in background (~30s window)
  → handler.ts handleBackgroundPush(notification)
  → check notification.request.content.data.type === 'bg_refresh'
  → fetchFreshData() [boundary: depends on 01-foundation API client]
  → updateWidgetData(data) [boundary: depends on 06-widgets]
  → if manager && newApprovals > prev: scheduleLocalNotification(count)
```

### Edge Cases

1. **Expo push API down**: `sendPushBatch` wraps fetch in try/catch; cron continues without crashing; next run will retry all tokens.

2. **Empty token DB**: `getAllTokens()` returns `[]`; `sendPushBatch([])` returns immediately with `{ sent: 0, failed: 0, staleTokens: [] }`.

3. **Permissions denied on device**: `registerPushToken()` returns early; no token registered; device simply won't receive background refreshes (graceful degradation).

4. **User logs out before unregister completes**: AsyncStorage token read returns null; `unregisterPushToken()` returns early. Stale token will be cleaned up on next `DeviceNotRegistered` response from Expo.

5. **Background handler called concurrently**: Expo notification listener may fire multiple times in rapid succession. Handler should be idempotent — duplicate fetches are harmless, last write wins for widget data.

6. **fetchFreshData fails** (no network, Crossover API down): Handler catches error, logs it, does not crash. Widget retains previous cached data.

7. **DB file not writable on Railway**: `better-sqlite3` will throw on init; server fails to start cleanly with an error message. This is surfaced at deploy time, not silently at runtime.

### Dependencies

**Server (`server/package.json`):**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "better-sqlite3": "^9.0.0",
    "node-cron": "^3.0.0",
    "node-fetch": "^3.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node-cron": "^3.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**App additions (`hourglassws/package.json`):**
- `expo-notifications` (already required by Expo SDK 55)
- `@react-native-async-storage/async-storage` (already in foundation spec)
- `expo-constants` (already in foundation spec)

### Boundary Contracts with Other Specs

| Boundary | Spec | What 07 calls | What 07 expects back |
|----------|------|---------------|----------------------|
| Data fetch | 01-foundation | `fetchFreshData()` | `CrossoverSnapshot` object with `pendingApprovals: ApprovalItem[]` |
| Widget update | 06-widgets | `updateWidgetData(data)` | `Promise<void>` |

These boundaries are called by `handler.ts` but implemented in other specs. For testing `handler.ts`, these are mocked.

### Environment Config

```typescript
// src/lib/pushToken.ts
const PING_SERVER_URL = process.env.EXPO_PUBLIC_PING_SERVER_URL ?? 'https://hourglass-ping.railway.app'
```

```
// server/.env.example
PING_SERVER_PORT=3000
# No other secrets required for v1
```
