# ⚠️ Deprecated — This project has been superseded

**Hourglass.xo is now a native iOS and Android app.**

> Download on TestFlight: **https://testflight.apple.com/join/eV25Wbvh**
>
> Source code: **https://github.com/jaime-alvarez-trilogy/hourglass-app**

This Scriptable widget is no longer maintained. The new app has everything the widget had — hours, earnings, AI%, BrainLift, manager approvals — plus native iOS/Android widgets, push notifications, and a full dashboard. No Scriptable required.

---

# HourGlass — Crossover Widget for iOS (Archived)

A Scriptable widget that brings your Crossover hours tracking, AI usage metrics, and time approval management to your iOS Home Screen, Lock Screen, and StandBy.

## One-Tap Install

**Requires [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) on your iPhone/iPad.**

[**Install HourGlass**](https://jaime-alvarez-trilogy.github.io/hourglass/) — opens the download page on your phone.

Or manually: copy the contents of `hourglass.js` into a new script in Scriptable.

## Video Tutorial

Watch the 1-minute install walkthrough on the [install page](https://jaime-alvarez-trilogy.github.io/hourglass/), or view the video directly: [`assets/hourglass-install-tutorial.mp4`](assets/hourglass-install-tutorial.mp4).

## Setup

1. Install via the link above — the script appears in Scriptable automatically
2. Run the script — the setup wizard will walk you through:
   - Environment selection (Production / QA)
   - Crossover credentials (stored locally in iOS Keychain — never leaves your device)
   - Automatic team, role, and rate detection
3. Add the widget to your Home Screen:
   - Long-press Home Screen → "+" → Scriptable
   - Choose widget size (small, medium, or large)
   - Long-press the widget → Edit Widget → choose "HourGlass" as the script

## Features

### Hours & Earnings Tracking
- Weekly hours worked with daily breakdown bar chart
- Earnings tracking (weekly total at your hourly rate)
- Hours remaining and deadline countdown
- Today's hours and daily average
- Source of truth: Crossover Payments API (matches Earnings tab exactly)

### AI Usage & BrainLift Tracking
- **AI%**: Real-time percentage of work slots using AI tools (target: 75%)
- **BrainLift hours**: Time spent on Second Brain / BrainLift sessions (target: 5h/week)
- Context-aware color coding: green/yellow/red based on where you *should* be at this point in the week
- Per-day breakdown in the interactive view
- Displayed as a ±2% range to reflect measurement precision
- Smart caching: fetches work diary data every 2 hours, not every widget refresh

### Manager Approvals (auto-detected)
- Pending manual time approvals with one-tap approve/reject
- Pending overtime requests with cost display
- Push notifications when new approvals arrive
- Deadline reminders with escalating urgency (3h → 1h → 5min)
- Bulk approve/reject all pending items

### Widget Sizes

| Size | What's shown |
|------|-------------|
| **Small** | Hours total, earnings, hours remaining, AI/BL status dots |
| **Medium** | Two-column hours/earnings, deadline, today's hours, AI%/BL row |
| **Large** | Full layout: hours, earnings, daily bar chart, AI/BL progress bars |
| **Lock Screen** | Hours, earnings, hours remaining, AI% (rectangular accessory) |

### Interactive Dashboard
Tap any widget to open the full in-app dashboard with:
- Large earnings display with hourly rate
- Hours remaining with potential earnings
- Daily breakdown table
- AI Usage & BrainLift section with per-day AI% and BL hours
- Settings (update check, rate change, reconfigure)
- For managers: per-item approve/reject buttons and bulk actions

## How It Works

### Role Detection
The widget auto-detects your role from the Crossover API (`avatarTypes` includes `"MANAGER"`). Role is refreshed every Monday via the `/api/identity/users/current/detail` endpoint.

- **Contributors**: Fetches timesheet + payments + work diary (2-3 API calls)
- **Managers**: Also fetches pending manual time + overtime (4-5 API calls + notifications)

### Data Sources
| Data | API Endpoint | Refresh |
|------|-------------|---------|
| Hours/Earnings | `/api/v3/users/current/payments` + `/api/timetracking/timesheets` | Every widget refresh |
| AI% & BrainLift | `/api/timetracking/workdiaries?assignmentId=&date=` | Every 2 hours |
| Manual approvals | `/api/timetracking/workdiaries/manual/pending` | Every widget refresh |
| Overtime | `/api/overtime/request?status=PENDING` | Every widget refresh |
| Role/rate/IDs | `/api/identity/users/current/detail` | Weekly (Mondays) |

### Caching & Failover
- **Hours cache** (`crossover-cache.json`): Stores last known hours data. If the API fails (network issue, auth timeout), the widget shows cached data with an orange "Cached:" timestamp instead of an error.
- **AI cache** (`crossover-ai-cache.json`): Stores per-day slot tag counts. Refreshes every 2 hours. Past days stay cached; only today is re-fetched. Cache is pruned to current week on each access.

### Auto-Updates
The script checks for updates each time you open it in Scriptable. When a new version is available, you'll be prompted to update with one tap. Widget mode checks silently — no interruptions.

## Privacy & Security

- Credentials are stored in your **iOS Keychain** — encrypted, on-device only
- No data is sent anywhere except the official Crossover API (`api.crossover.com`)
- The script is open source — inspect every line
- No analytics, no tracking, no third-party services

## File Structure

```
hourglass.js            — Main widget script (~2,900 lines)
crossover-widget.js     — Standalone hours-only widget (lightweight alternative)
version.json            — Version for auto-update mechanism
docs/                   — Documentation
tools/                  — Test scripts and setup utilities
assets/                 — Logo images
```

## Troubleshooting

### Widget shows "Open app to set up"
Run the script directly in Scriptable (not as a widget) to trigger the setup wizard. Widgets can't show interactive alerts.

### Widget shows "Cached:" with orange timestamp
The API call failed (network issue or auth timeout). The widget is showing the last successful data. It will auto-recover on the next refresh. If it persists, open the script in Scriptable to retry.

### AI% shows gray dots or "low data"
Normal early in the week — needs at least 20 tagged slots (~3.3 hours) before showing a reliable percentage. The gray dots mean "not enough data yet."

### Hours don't match the Crossover dashboard
HourGlass uses the Payments API (`paidHours`) which matches the Earnings tab. The Time Tracking page may show slightly different numbers (`workedHours`) due to rounding.

### Debug mode
Open Settings in the interactive view → the script version and config are shown. For deeper debugging, set `debugMode: true` in the config file (`crossover-config.json` in Scriptable's documents folder).

## Lightweight Alternative

`crossover-widget.js` is a standalone hours-only widget (~900 lines) if you don't need approval management or AI tracking.
