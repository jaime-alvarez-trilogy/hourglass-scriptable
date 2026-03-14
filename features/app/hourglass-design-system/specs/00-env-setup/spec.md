# 00-env-setup

**Status:** Draft
**Created:** 2026-03-14
**Last Updated:** 2026-03-14
**Owner:** @trilogy

---

## Overview

Two housekeeping gaps exist in the project configuration:

1. `hourglassws/.gitignore` does not include `gauntlet-output/`. The `ux-gauntlet.ts` tool writes
   AI-generated TSX and image data to this directory; without a gitignore entry, those files
   could be accidentally committed.

2. No `.env.example` file exists. The project requires `OPENROUTER_API_KEY` (used by
   `tools/gemini-ui.ts` and `tools/ux-gauntlet.ts`) but provides no reference template. New
   contributors cloning the repo receive no guidance on required environment variables.

This spec fixes both gaps: one line added to `.gitignore`, one new file created at
`hourglassws/.env.example` with placeholder values and comments.

---

## Out of Scope

1. **Adding other gitignore entries beyond `gauntlet-output/`** — **Descoped.** The audit
   identified only this one missing entry. Other entries are already correct.

2. **Documenting Expo/EAS environment variables in `.env.example`** — **Deferred to
   01-nativewind-verify.** No `EXPO_PUBLIC_*` vars are currently needed; if they arise
   during NativeWind verification they will be added then.

3. **Storing or rotating real API keys** — **Descoped.** This spec only creates a template
   with placeholder values; credential management is out of scope.

4. **CI/CD environment variable configuration** — **Descoped.** EAS secrets and GitHub Actions
   secrets are managed separately from the `.env.example` developer reference.

---

## Functional Requirements

### FR1: Add `gauntlet-output/` to `.gitignore`

Add a single line to `hourglassws/.gitignore` so the `gauntlet-output/` directory is
excluded from version control.

**Success Criteria:**
- `gauntlet-output/` appears as an entry in `hourglassws/.gitignore`
- Running `git check-ignore -v gauntlet-output/` from the `hourglassws/` directory
  returns the directory as ignored
- All pre-existing `.gitignore` entries remain unchanged
- The entry is placed in a logical location (e.g. after or near other output/generated
  directory entries)

---

### FR2: Create `.env.example`

Create a new file at `hourglassws/.env.example` that documents required environment
variables with placeholder values and explanatory comments.

**Success Criteria:**
- File exists at `hourglassws/.env.example`
- Contains `OPENROUTER_API_KEY=your_openrouter_api_key_here` (placeholder, not a real key)
- Contains a comment explaining where to obtain the key (https://openrouter.ai/keys)
- Contains a comment block for QA credentials with variables commented out (not active)
- The file itself is NOT listed in `.gitignore` (it must be committable as documentation)
- No real credentials or secret values appear in the file

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/.gitignore` | Add `gauntlet-output/` entry |

### Files to Create

| File | Purpose |
|------|---------|
| `hourglassws/.env.example` | Environment variable reference template |

### Data Flow

Not applicable — this spec is pure configuration (no runtime code).

### Implementation Details

**FR1 — `.gitignore` edit:**

Add `gauntlet-output/` after the existing `app-example` entry in a new "generated output"
comment block:

```
# generated output
gauntlet-output/
```

**FR2 — `.env.example` content:**

```bash
# OpenRouter API key — used by tools/gemini-ui.ts and tools/ux-gauntlet.ts
# Get yours at: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# QA environment test credentials (DO NOT commit real credentials)
# Set these in .env.local (gitignored), not here
# QA_EMAIL=
# QA_PASSWORD=
```

### Files to Reference

- `hourglassws/.gitignore` — file being modified
- `hourglassws/tools/gemini-ui.ts` — confirms `OPENROUTER_API_KEY` usage
- `hourglassws/tools/ux-gauntlet.ts` — confirms `OPENROUTER_API_KEY` usage and `gauntlet-output/` write path
- `hourglassws/.env.local` — existing vars to document (do not commit)

### Edge Cases

- If `gauntlet-output/` directory already exists and has files tracked by git, adding the
  gitignore entry alone will not untrack them. This is acceptable — the directory does not
  currently exist in the repo, so no untracking is needed.
- The `.env.example` file must never appear in `.gitignore` itself (it is documentation,
  not a secret).
