# Spec Research: 00-env-setup

## Problem Context

Two small housekeeping gaps discovered in the audit:

1. `.gitignore` does not list `gauntlet-output/` — if someone runs `ux-gauntlet.ts` and the
   tool writes output to that directory, the files could be accidentally committed (they may
   contain large AI-generated TSX and image data).

2. No `.env.example` file exists. The project uses `OPENROUTER_API_KEY` (for gemini-ui and
   ux-gauntlet tools) but there is no reference template showing contributors what env vars
   are required. Developers cloning the repo get no guidance.

## Exploration Findings

**Current .gitignore (key entries):**
```
node_modules/
dist/
web-build/
.expo/
/ios
/android
.env*.local      ← covers .env.local (where QA creds live)
```

Missing: `gauntlet-output/` — the tools directory contains `ux-gauntlet.ts` which may write
output files. By convention the output directory should be gitignored.

**Env vars used by the project:**
- `OPENROUTER_API_KEY` — used by `tools/gemini-ui.ts` and `tools/ux-gauntlet.ts`
- `EXPO_PUBLIC_*` — not currently used but may be needed for future feature flags
- `.env.local` has: `OPENROUTER_API_KEY=...` and QA test credentials

**`.env.example` approach:**
Standard practice: `.env.example` contains placeholder values with comments describing
each variable. It is committed to the repo (not gitignored), serves as documentation.

## Key Decisions

1. **gitignore entry**: Add `gauntlet-output/` to the existing `.gitignore`.
2. **`.env.example` location**: Project root (`hourglassws/.env.example`), same level as `.env.local`.
3. **What to document**: `OPENROUTER_API_KEY` with a comment pointing to OpenRouter dashboard.
   Include section header for future Expo/EAS vars.

## Interface Contracts

No code interfaces — this spec is pure configuration.

**Output files:**
- `hourglassws/.gitignore` — add `gauntlet-output/` line
- `hourglassws/.env.example` — new file with documented placeholder values

**`.env.example` content:**
```bash
# OpenRouter API key — used by tools/gemini-ui.ts and tools/ux-gauntlet.ts
# Get yours at: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# QA environment test credentials (DO NOT commit real credentials)
# Set these in .env.local (gitignored), not here
# QA_EMAIL=
# QA_PASSWORD=
```

## Test Plan

### FR1: gitignore updated
- [ ] `gauntlet-output/` appears in `.gitignore`
- [ ] Running `git check-ignore gauntlet-output/` returns the directory as ignored
- [ ] Existing gitignore entries unchanged

### FR2: .env.example created
- [ ] File exists at `hourglassws/.env.example`
- [ ] Contains `OPENROUTER_API_KEY` with placeholder value
- [ ] Contains a comment explaining where to get the key
- [ ] File is NOT gitignored (should be committed)
- [ ] `OPENROUTER_API_KEY` value is NOT a real key

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/.gitignore`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/.env.local` (to identify all vars, do not commit)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tools/gemini-ui.ts` (line 29: `API_KEY = process.env.OPENROUTER_API_KEY`)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tools/ux-gauntlet.ts` (OPENROUTER_API_KEY usage)

## Complexity

**S** — 2 file edits, no code, no tests beyond manual verification.

## FRs

1. Add `gauntlet-output/` to `.gitignore`
2. Create `.env.example` with `OPENROUTER_API_KEY` placeholder and comments
