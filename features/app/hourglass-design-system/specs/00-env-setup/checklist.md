# Implementation Checklist

Spec: `00-env-setup`
Feature: `hourglass-design-system`

---

## Phase 1.0: Test Foundation

> Note: This spec is pure configuration (no runtime code). Tests are verification checks,
> not automated test files.

### FR1: Add `gauntlet-output/` to `.gitignore`
- [ ] Verify `gauntlet-output/` entry appears in `hourglassws/.gitignore`
- [ ] Run `git check-ignore -v gauntlet-output/` from `hourglassws/` — confirms ignored
- [ ] Confirm all pre-existing `.gitignore` entries remain unchanged

### FR2: Create `.env.example`
- [ ] Verify file exists at `hourglassws/.env.example`
- [ ] Verify `OPENROUTER_API_KEY=your_openrouter_api_key_here` present (placeholder only)
- [ ] Verify comment links to https://openrouter.ai/keys
- [ ] Verify QA credential variables are commented out
- [ ] Verify `.env.example` is NOT listed in `.gitignore`
- [ ] Verify no real API keys or credentials in the file

---

## Test Design Validation (MANDATORY)

- [ ] All FR success criteria have verification coverage above
- [ ] No real secrets appear in any committed file

---

## Phase 1.1: Implementation

### FR1: Add `gauntlet-output/` to `.gitignore`
- [ ] Add `gauntlet-output/` entry to `hourglassws/.gitignore` (after `app-example` line)
- [ ] Commit: `feat(FR1): add gauntlet-output/ to .gitignore`

### FR2: Create `.env.example`
- [ ] Create `hourglassws/.env.example` with OPENROUTER_API_KEY placeholder and comments
- [ ] Commit: `feat(FR2): add .env.example with OPENROUTER_API_KEY placeholder`

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] FR1 success criteria verified: `gauntlet-output/` in `.gitignore`, git confirms ignored
- [ ] FR2 success criteria verified: `.env.example` exists with correct content
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Commit fixes: `fix(00-env-setup): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on verification checks
- [ ] Apply suggested improvements that strengthen confidence

### Final Verification
- [ ] `git check-ignore -v gauntlet-output/` returns ignored
- [ ] `hourglassws/.env.example` exists and committed
- [ ] No regressions in existing project setup

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-14**: Spec created. Two configuration gaps from audit: missing gitignore entry
and missing .env.example. S complexity — 2 file changes, no runtime code.
