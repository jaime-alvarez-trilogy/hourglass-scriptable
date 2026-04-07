# Feature: Android Floating Pill Nav

## Goal

Split tab bar navigation by platform: iOS keeps `NativeTabs` (UITabBarController, automatic iOS 26 glass pill), while Android gets a custom floating pill tab bar — a semi-opaque dark surface pill that floats above content with a violet active-tab highlight.

## Design Decisions

- **Background**: `colors.surface` (#16151F) semi-opaque + `colors.border` (#2F2E41) border. No BlurView (avoids Android GPU framebuffer allocation issues on older devices).
- **Active indicator**: Filled rounded rect behind active icon+label using violet at 15% opacity + violet stroke.
- **Labels**: Icon + label on all tabs (matches NativeTabs behavior).
- **Press feedback**: Reanimated `springSnappy` scale (0.92) on press.
- **Positioning**: `position: 'absolute'`, bottom = 24 + insets.bottom, left/right = 20.
- **Screen padding**: All tab screens get `paddingBottom` equal to pill height + offset + safe area so content is never hidden.

## Specs

| # | Spec | Depends On |
|---|------|------------|
| 01 | floating-pill-tab | — |
| 02 | platform-split-nav | 01 |

## Changelog

- 2026-04-07: Feature created — platform-split nav (NativeTabs iOS, floating pill Android)
- 2026-04-06: [01-floating-pill-tab](specs/01-floating-pill-tab/spec.md) — Spec and checklist created for FloatingPillTabBar component
