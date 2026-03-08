# Spec Research: 07-ping-server

## Problem Context

The app needs a way to wake devices in the background every 15 minutes so the app can fetch fresh Crossover data and update the widget. The server sends only a silent push notification — it knows nothing about users' data or credentials. This is the smallest possible backend: a cron job + a device token store + a push dispatcher.

## Exploration Findings

### Silent Push Notifications

**iOS:** Silent push = `content-available: 1` with no `alert`, no `sound`. iOS wakes the app in the background for ~30 seconds to run a background task. Battery impact: negligible (no UI, no user alert).

**Android:** "Data message" via FCM — same concept. App wakes, processes, goes back to sleep.

**Expo Push API:**
```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

{
  "to": "ExponentPushToken[xxx]",
  "data": { "type": "background_refresh" },
  "_contentAvailable": true   // iOS silent push flag
}
```

Expo's push service is free and handles both APNs and FCM. No need to manage APNs certificates directly.

### Device Token Registration

The app gets an Expo Push Token via `expo-notifications`:
```typescript
const token = await Notifications.getExpoPushTokenAsync({ projectId })
```

This token must be sent to the server so the server knows who to ping. The server stores `{ deviceToken, updatedAt }` — no user data, no credentials.

### What the Server Needs

1. **POST /register** — app sends device token on login/app open
2. **Cron (every 15 min)** — fetch all tokens, send silent push to each
3. **POST /unregister** — app sends token on logout (cleanup)

That's it. The server is stateless with respect to Crossover — it never touches the Crossover API.

### Infrastructure: Vercel

- Free tier: 100GB bandwidth/month, serverless functions, cron jobs (Pro tier needed for cron — $20/month)
- Alternative: **Railway** free tier supports cron — better fit
- Alternative: **Render** free tier + cron job — also works
- Recommended: **Railway** — free tier, persistent server, built-in cron, simple Node.js deploy

### Database for Token Storage

- SQLite on Railway (simplest) or Supabase free tier (PostgreSQL)
- Only one table: `device_tokens(token TEXT PRIMARY KEY, updated_at TIMESTAMP)`
- Expected size at 500 users: <50KB — any DB works

### Scale Check (500 users)

- 500 tokens × 96 pushes/day = 48,000 Expo push API calls/day
- Expo free tier: 1,000 pushes/month → **will exceed free tier at scale**
- Expo paid: $25/month for 100,000 notifications/month
- Alternative: Send pushes in batches of 100 via Expo batch API → reduces API calls
- Railway server: $5/month handles this trivially

**Total server cost at 500 users: ~$30/month** (Railway $5 + Expo push $25)

## Key Decisions

### Decision 1: Railway over Vercel for cron
- Vercel requires Pro ($20/month) for cron jobs <1 hour intervals
- Railway free tier supports persistent Node.js + cron via `node-cron`
- Rationale: free to start, easy to scale

### Decision 2: Expo Push Service (not direct APNs/FCM)
- Expo handles APNs cert management, FCM key management, retries
- Single API for both platforms
- Rationale: eliminates platform-specific push infrastructure entirely

### Decision 3: No auth on /register endpoint in v1
- Anyone with the endpoint URL could register a token
- Acceptable for v1 — tokens without valid Crossover credentials do nothing
- Rationale: simplicity, low risk (no user data exposed)

### Decision 4: Batch push sends
- Send pushes in chunks of 100 (Expo batch API limit)
- Rationale: efficient, respects Expo rate limits

## Interface Contracts

### Server API

```
POST /register
Body: { token: string }
Response: { ok: true }
Side effect: upsert token in DB with updatedAt = now

POST /unregister
Body: { token: string }
Response: { ok: true }
Side effect: delete token from DB

GET /health
Response: { ok: true, tokenCount: number }
```

### Cron Job

```
Schedule: */15 * * * * (every 15 minutes)

1. SELECT all tokens from DB
2. Chunk into arrays of 100
3. For each chunk: POST to Expo push API
   Body: [{ to: token, data: { type: 'bg_refresh' }, _contentAvailable: true }]
4. Log success/failure counts
5. Remove tokens that returned DeviceNotRegistered error (stale tokens)
```

### App Side (Expo)

```typescript
// src/lib/pushToken.ts

async function registerPushToken(): Promise<void>
// 1. Request notification permissions
// 2. Get Expo push token
// 3. POST /register with token
// 4. Store token in AsyncStorage for unregister

async function unregisterPushToken(): Promise<void>
// 1. Read token from AsyncStorage
// 2. POST /unregister
// 3. Remove from AsyncStorage

// Called from background notification handler:
async function handleBackgroundPush(notification: Notification): Promise<void>
// If data.type === 'bg_refresh':
//   1. Fetch fresh Crossover data
//   2. updateWidgetData()
//   3. Schedule local notification if new approval items found
```

## Test Plan

### Server /register

- [ ] Returns 200 with `{ ok: true }` for valid token string
- [ ] Upserts token (second call with same token doesn't duplicate)
- [ ] Rejects empty token with 400

### Server cron

- [ ] Fetches all tokens from DB
- [ ] Chunks into arrays of ≤100
- [ ] Calls Expo push API for each chunk
- [ ] Removes stale tokens (`DeviceNotRegistered` errors)
- [ ] Logs push count

### App registerPushToken

- [ ] Requests permissions before getting token
- [ ] Returns early if permissions denied
- [ ] POSTs token to server
- [ ] Stores token in AsyncStorage

### App handleBackgroundPush

- [ ] Only processes `data.type === 'bg_refresh'` messages
- [ ] Calls fresh data fetch
- [ ] Calls `updateWidgetData` with fresh data
- [ ] Schedules local notification if new approval items detected

## Files to Create

```
server/
  index.ts              — Express server: /register, /unregister, /health
  cron.ts               — node-cron task: fetch tokens → send pushes
  db.ts                 — SQLite or Supabase client, token CRUD
  push.ts               — Expo push batch sender
  package.json
  railway.json          — Railway deployment config

src/
  lib/
    pushToken.ts        — registerPushToken, unregisterPushToken
  notifications/
    handler.ts          — handleBackgroundPush, scheduleLocalNotification
```

## Files to Reference

- `WS/hourglass.js` — `checkAndNotify()`, `scheduleDeadlineReminders()` — notification patterns to port
- `WS/app/CONTEXT.md` — architecture decision: credentials stay on device
- Expo Push Notifications docs: https://docs.expo.dev/push-notifications/overview/
- react-native-android-widget task handler pattern (for Android background handling)
