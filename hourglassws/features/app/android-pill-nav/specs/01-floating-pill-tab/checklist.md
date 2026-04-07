# Checklist: 01-floating-pill-tab

## Phase 1.0 — Tests (Red Phase)

Write failing tests before any implementation. All tests must fail initially.

### FR1 — Pill Container Tests

- [ ] SC1.1 — `FloatingPillTabBar` is exported as a named export
- [ ] SC1.2 — Container `View` has `position: 'absolute'`
- [ ] SC1.3 — Container uses `useSafeAreaInsets` from `react-native-safe-area-context`
- [ ] SC1.4 — Container has `left: 20` and `right: 20`
- [ ] SC1.5 — Container has `borderRadius` >= 24
- [ ] SC1.6 — Container background uses `colors.surface`
- [ ] SC1.7 — Container border uses `colors.border`
- [ ] SC1.8 — Container uses `flexDirection: 'row'`

### FR2 — Tab Items Tests

- [ ] SC2.2 — `explore` route is filtered/excluded from rendering
- [ ] SC2.3 — `MaterialIcons` imported from `@expo/vector-icons/MaterialIcons` and used for icons
- [ ] SC2.4 — Label text has `fontSize: 10`
- [ ] SC2.5 — Inactive color references `inactiveTintColor`
- [ ] SC2.6 — `ICON_MAP` or equivalent maps all 4 SF icon names to MD names (`home`, `bar_chart`, `auto_awesome`, `check_circle`)

### FR3 — Active Indicator Tests

- [ ] SC3.1 — Active indicator rendered conditionally (not always shown)
- [ ] SC3.2 — Active indicator background includes `colors.violet` + `'1A'` suffix OR `rgba` equivalent
- [ ] SC3.3 — Active indicator has `borderColor: colors.violet`
- [ ] SC3.4 — Active indicator `borderRadius` >= 10
- [ ] SC3.5 — Active icon/label uses `tintColor` prop (not hardcoded)

### FR4 — Press Feedback Tests

- [ ] SC4.1 — `useSharedValue` imported and used from `react-native-reanimated`
- [ ] SC4.2 — `useAnimatedStyle` used for scale transform
- [ ] SC4.3 — `withSpring` and `springSnappy` used for press animation
- [ ] SC4.5 — `Animated.View` from reanimated wraps tab item

### FR5 — Badge Tests

- [ ] SC5.1 — Badge container has `position: 'absolute'`
- [ ] SC5.3 — Badge only renders conditionally (guarded by `badge > 0` or similar)
- [ ] SC5.4 — Badge renders numeric count as text
- [ ] SC5.5 — Badge uses `colors.critical` background

---

## Phase 1.1 — Implementation (Green Phase)

Implement minimum code to make all Phase 1.0 tests pass.

### FR1 — Pill Container Implementation

- [ ] Create `src/components/FloatingPillTabBar.tsx` with named export `FloatingPillTabBar`
- [ ] Implement absolutely-positioned container: `position: 'absolute'`, `bottom: 24 + insets.bottom`, `left: 20`, `right: 20`
- [ ] Apply `borderRadius: 28`, `backgroundColor: colors.surface`, `borderWidth: 1`, `borderColor: colors.border`
- [ ] Apply `flexDirection: 'row'`, `paddingVertical: 8`, `paddingHorizontal: 4`
- [ ] Wire `useSafeAreaInsets()` for bottom inset

### FR2 — Tab Items Implementation

- [ ] Define `PILL_TABS` constant with 4 visible tabs (name, label, icon)
- [ ] Define `ICON_MAP` mapping SF icon names to MaterialIcons names
- [ ] Implement `PillTabItem` internal sub-component
- [ ] Filter `state.routes` to exclude `explore` route (skip if not in PILL_TABS)
- [ ] Render `MaterialIcons` with `size={20}` and appropriate color
- [ ] Render `Text` label with `fontSize: 10`
- [ ] Wire `onPress` to `navigation.navigate` + emit `tabPress`
- [ ] Wire `onLongPress` to emit `tabLongPress`

### FR3 — Active Indicator Implementation

- [ ] Render active indicator `View` only when `isActive === true`
- [ ] Apply `backgroundColor: colors.violet + '1A'` to active indicator
- [ ] Apply `borderWidth: 1, borderColor: colors.violet` to active indicator
- [ ] Apply `borderRadius: 14` to active indicator
- [ ] Use `tintColor` prop for active icon and label color

### FR4 — Press Feedback Implementation

- [ ] Import `Animated`, `useSharedValue`, `useAnimatedStyle`, `withSpring` from `react-native-reanimated`
- [ ] Import `springSnappy` from `@/src/lib/reanimated-presets`
- [ ] Initialize `scale = useSharedValue(1)` per PillTabItem
- [ ] Apply `useAnimatedStyle` returning `{ transform: [{ scale: scale.value }] }`
- [ ] On `pressIn`: `scale.value = withSpring(0.92, springSnappy)`
- [ ] On `pressOut`: `scale.value = withSpring(1.0, springSnappy)`
- [ ] Wrap each item in `Animated.View` with animated style; place `Pressable` inside

### FR5 — Badge Implementation

- [ ] Accept `badge` prop in `PillTabItem` (from `badgeCounts[route.name]` or `descriptors[route.key].options.tabBarBadge`)
- [ ] Render badge `View` only when `badge > 0`
- [ ] Apply `position: 'absolute'`, `top: -4`, `right: -4` to badge container
- [ ] Apply `width: 12`, `height: 12`, `borderRadius: 6`, `backgroundColor: colors.critical`
- [ ] Render `Text` showing badge count, `fontSize: 8`, `color: 'white'`, `fontWeight: 'bold'`

---

## Phase 1.2 — Review

### Alignment Check

- [ ] Run spec-implementation-alignment check: verify all FR success criteria implemented
- [ ] Verify `FloatingPillTabBar` exported as named export (not default)
- [ ] Verify `explore` tab excluded from pill
- [ ] Verify `MaterialIcons` used instead of `IconSymbol` (Android mapping gap)
- [ ] Verify no `expo-blur` import (explicitly excluded)

### PR Review

- [ ] Run `pr-review-toolkit:review-pr` on this spec's changes
- [ ] Address any review feedback

### Test Optimization

- [ ] Run test-optimiser on `FloatingPillTabBar.test.ts`
- [ ] Verify tests fail on missing/wrong implementation (red-phase validated)
- [ ] Verify tests pass with correct implementation (green-phase validated)
- [ ] Remove any redundant test assertions

---

## Session Notes

_To be filled in after execution._
