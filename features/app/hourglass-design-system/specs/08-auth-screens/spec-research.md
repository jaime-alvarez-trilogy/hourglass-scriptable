# Spec Research: 08-auth-screens

## Problem Context

All 5 auth screens (welcome, credentials, verifying, setup, success) use `StyleSheet.create()`
with hardcoded hex colors and no Reanimated animations. They need a rebuild to the dark glass
aesthetic from BRAND_GUIDELINES.md:
- Airy, glass-panel feel on dark background
- Entrance animations (springBouncy for panels, fade-in for text)
- NativeWind className throughout
- Consistent padding, typography hierarchy, and spacing tokens

These are the first screens a new user sees — they set the tone for the app's quality.

## Exploration Findings

**Current auth screen inventory:**

1. **welcome.tsx** — Full-screen splash: app name, tagline, "Get Started" CTA button.
   Colors: #0D1117 bg, #00FF88 button (clash with design system — gold/success is the brand accent).

2. **credentials.tsx** — Email + password form, QA/Prod environment toggle, "Sign In" button.
   Has keyboard avoiding behavior. Colors: #1C1C1E inputs, #00FF88 button (off-brand).

3. **verifying.tsx** — Loading spinner with "Verifying..." text. Non-dismissible.
   Simple screen, just needs tokens applied.

4. **setup.tsx** — Team selection (picker/scroll), role display, "Continue" button.
   Most complex auth screen — async team fetch, loading state.

5. **success.tsx** — "You're all set!" confirmation, user name display, "Open Dashboard" CTA.
   Transition into the main app.

**Current shared patterns (to migrate):**
- `StyleSheet.create()` → replace with `className`
- `#00FF88` (off-brand green) → replace with `bg-success` or `bg-gold` (brand CTA)
- `#0D1117` bg → replace with `bg-background`
- `#1C1C1E` inputs → replace with `bg-surface border-border`
- White text (#FFFFFF) → replace with `text-textPrimary`
- No animations → add springBouncy entrance for panels/cards

**OnboardingContext:**
All auth screens share `OnboardingContext` which manages the multi-step flow state.
The context and hook (`useOnboarding`) remain unchanged by this spec.

**Keyboard handling:**
`credentials.tsx` uses `KeyboardAvoidingView`. This must be preserved.
With NativeWind, `KeyboardAvoidingView` works the same way with className.

**Font families for auth:**
- App logo/name: `font-display-bold text-4xl text-textPrimary`
- Taglines: `font-body text-base text-textSecondary`
- Form labels: `font-sans-medium text-sm text-textSecondary`
- Input text: `font-sans text-base text-textPrimary`
- CTA buttons: `font-sans-semibold text-base`

**Button design:**
Primary CTA buttons: `bg-gold rounded-xl py-4 px-8` with `text-background font-sans-semibold`.
Gold on dark = premium feel per guidelines.

**Input design:**
`bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary font-sans`
Focus state: `border-gold` (requires focus tracking via `useState`).

**Entrance animations:**
- Logo/title: fade in (CSS animation or opacity withTiming)
- Card/panel: slide up + fade in with springBouncy
- Form fields: stagger in with 100ms delay increments
- Success screen: scale up with springBouncy

## Key Decisions

1. **Button color**: Replace `#00FF88` with `bg-gold` — gold is the primary brand CTA color.
   This is an intentional brand fix from the original hastily-coded screens.

2. **Input focus state**: Use `useState<boolean>` for focus, apply `border-gold` on focused
   input. No Reanimated needed for simple border color switch.

3. **verifying.tsx animation**: The loading spinner should be Reanimated (CSS animation rotate
   or `withRepeat(withTiming(...))` for the spinner). Use `timingSmooth` for the pulse.

4. **setup.tsx**: Keep the team picker logic unchanged. Only update visual styling.
   The `ActivityIndicator` loading state gets `color={colors.textSecondary}`.

5. **success.tsx**: Add a springBouncy scale entrance for the checkmark/success icon.
   MetricValue not needed here — just static Text.

6. **Shared auth container**: Extract `AuthContainer` component (local to auth screens, not
   exported to global component library). It provides: `bg-background flex-1 px-4` wrapper
   with `SafeAreaView`. Used by all 5 screens.

7. **Layout**: All screens are scrollable when keyboard is visible (credentials screen needs
   ScrollView + KeyboardAvoidingView combo).

## Interface Contracts

```typescript
// app/(auth)/_layout.tsx — no change needed

// Local component (not exported):
// AuthContainer — bg-background SafeAreaView wrapper for all auth screens
function AuthContainer({ children }: { children: React.ReactNode }): JSX.Element

// Each screen is a page component (no props):
// app/(auth)/welcome.tsx — rebuilt
// app/(auth)/credentials.tsx — rebuilt
// app/(auth)/verifying.tsx — rebuilt (no change to logic)
// app/(auth)/setup.tsx — rebuilt (no change to logic)
// app/(auth)/success.tsx — rebuilt (no change to logic)
```

**Hooks consumed (unchanged):**
- `useOnboarding()` from `OnboardingContext`
- `useAuth()` — credentials screen
- `useConfig()` — setup screen
- `useRoleRefresh()` — setup screen

## Test Plan

### Welcome Screen
- [ ] Renders app name with font-display-bold
- [ ] "Get Started" button has bg-gold, text-background
- [ ] No hardcoded hex colors
- [ ] Entrance animation fires on mount (panel slides up)

### Credentials Screen
- [ ] Email input renders with bg-surface border-border
- [ ] Email input focus → border-gold applied
- [ ] Password input has secureTextEntry
- [ ] "Sign In" button has bg-gold, calls auth
- [ ] Error message shown in text-critical when auth fails
- [ ] KeyboardAvoidingView present
- [ ] QA/Prod toggle renders (environment switch)

### Verifying Screen
- [ ] Loading spinner animates
- [ ] "Verifying..." text in text-textSecondary
- [ ] Non-dismissible (no back button / modal dismiss)

### Setup Screen
- [ ] Loading state shows SkeletonLoader or ActivityIndicator
- [ ] Team list renders when data loaded
- [ ] Selected team highlighted with border-gold or bg-surfaceElevated
- [ ] "Continue" button enables only when team selected

### Success Screen
- [ ] Shows user's name from config
- [ ] Checkmark/icon has success color
- [ ] "Open Dashboard" navigates to /(tabs)
- [ ] SpringBouncy entrance on success icon

**Mocks Needed:**
- `useOnboarding` → mock context values
- `useAuth` → mock login function + loading state
- `useConfig` → mock config with user name

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(auth)/welcome.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(auth)/credentials.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(auth)/verifying.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(auth)/setup.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(auth)/success.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/contexts/OnboardingContext.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/reanimated-presets.ts` — springBouncy, timingSmooth
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tailwind.config.js` — all tokens used in auth screens

## Complexity

**M** — 5 screens rebuilt, entrance animations, input focus states, local AuthContainer component.

## FRs

1. `AuthContainer` local component — shared SafeAreaView + bg-background wrapper for all auth screens
2. `welcome.tsx` rebuild — dark glass splash, gold CTA, springBouncy panel entrance
3. `credentials.tsx` rebuild — NativeWind inputs with focus state, KeyboardAvoidingView, gold button
4. `verifying.tsx` rebuild — Reanimated spinner, design token text
5. `setup.tsx` rebuild — team picker updated styling, selection state with border-gold
6. `success.tsx` rebuild — springBouncy success icon entrance, user name display, gold CTA
