# Approvals Polish

## Goal

Elevate the Requests tab to match the premium Liquid Glass aesthetic of the rest of the app:
apply BackdropFilter glass treatment to approval cards, replace the width-reveal swipe
indicators with a full-screen color glow that bleeds through the glass blur, and add the
animated mesh background driven by pending approval count.

## Specs

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-glass-swipe-card | Liquid Glass surface + glow swipe on ApprovalCard | — | — | M |
| 02-requests-mesh | AnimatedMeshBackground on Requests screen, approval-driven | — | — | S |

Both specs are independent and can be implemented in parallel.

## Context

- The UX Gauntlet (run-001-2026-03-24) produced the current ApprovalCard.tsx using
  width-based swipe reveal to prevent color bleed through the opaque card surface.
- This feature upgrades the card to Liquid Glass (BackdropFilter), which makes color bleed
  intentional and premium: the green/red glow behind the glass tints the card surface as
  the user drags, creating a "lit card" effect.
- The Requests screen currently has a flat bg-background with no ambient mesh.
- Rejection confirmation via RejectionSheet is already implemented — not in scope.

## Files Touched

### 01-glass-swipe-card
- `src/components/ApprovalCard.tsx` — glass surface + glow swipe

### 02-requests-mesh
- `app/(tabs)/approvals.tsx` — add AnimatedMeshBackground

## Changelog

### 01-glass-swipe-card
- **Status**: Spec complete
- **Date**: 2026-03-24
- **Spec**: [specs/01-glass-swipe-card/spec.md](specs/01-glass-swipe-card/spec.md)

### 02-requests-mesh
- **Status**: Spec complete
- **Date**: 2026-03-24
- **Spec**: [specs/02-requests-mesh/spec.md](specs/02-requests-mesh/spec.md)
