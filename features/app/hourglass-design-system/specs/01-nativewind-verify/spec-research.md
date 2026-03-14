# Spec Research: 01-nativewind-verify

## Problem Context

NativeWind v4 is installed and configured (metro.config.js, tailwind.config.js, global.css,
babel.config.js) but has **never been verified working in Expo Go**. The last attempt to
start Expo Go crashed with a Babel plugin error (now fixed), but the app was never confirmed
to actually render `className` props correctly.

Until this is verified, no components should be built against NativeWind because we could
be building on a broken foundation.

**Risk**: NativeWind v4 + Expo SDK 54 + New Architecture has known configuration edge cases.
A smoke test component prevents wasted effort building 50+ components on a broken setup.

## Exploration Findings

**NativeWind configuration (confirmed correct per codebase exploration):**
```javascript
// metro.config.js
const { withNativeWind } = require('nativewind/metro');
module.exports = withNativeWind(config, { input: './global.css' });

// tailwind.config.js
presets: [require('nativewind/preset')],
content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"]

// babel.config.js
presets: ['babel-preset-expo']  // NO nativewind/babel plugin (v4 doesn't need it)

// global.css
@tailwind base;
@tailwind components;
@tailwind utilities;

// app/_layout.tsx
import '../global.css';
```

**package.json versions:**
- `nativewind`: `^4.2.2`
- `tailwindcss`: `^3.4.19`
- `expo`: `~54.0.33`
- `react-native`: `0.81.5` (New Architecture enabled)

**NativeWind v4 + New Architecture compatibility:**
- NativeWind v4 supports New Architecture via JSI
- The `withNativeWind` metro plugin handles CSS processing
- No Babel plugin needed in v4 (confirmed, was the root of the crash)
- `global.css` import in `_layout.tsx` activates the stylesheet

**Known v4 gotchas:**
- Must use `cssInterop` for 3rd-party components (e.g., `import { cssInterop } from 'nativewind'`)
- SafeAreaView from `react-native-safe-area-context` needs cssInterop wrapping
- Custom color tokens MUST match exactly between tailwind.config.js and className strings
- `bg-background` will only work if `background` is defined in the `colors` extension

## Key Decisions

1. **Verification approach**: Create `src/components/NativeWindSmoke.tsx` — a minimal component
   that uses only NativeWind className props. If it renders correctly in Expo Go, NativeWind is
   working. Temporarily show it on the home screen, then remove after verification.

2. **What to test**: Background color, text color, spacing, and border radius — all using
   design system tokens (bg-background, text-gold, p-5, rounded-2xl). If these render
   correctly, the full token set will work.

3. **Fix approach if broken**: Document the specific error, apply fix, re-verify. Common
   fixes: clear Metro cache (`npx expo start --clear`), check cssInterop for wrapped components.

4. **Keep or remove**: The smoke component is TEMPORARY. Once verified, it's removed from
   the home screen (but the file can remain as a reference for the component library spec).

## Interface Contracts

```typescript
// src/components/NativeWindSmoke.tsx
// A minimal component rendering Hourglass design tokens via className only.
// Used ONLY for verification — not a production component.

export default function NativeWindSmoke(): JSX.Element
```

**Renders:**
- `bg-background` container
- `bg-surface` inner card with `rounded-2xl p-5 border border-border`
- `text-gold font-display text-3xl` hero number "42.5"
- `text-textSecondary font-sans text-sm` label "Hours This Week"
- `bg-cyan` accent dot

**Verification success criteria:**
- Dark background (#0A0A0F) renders (not white/grey)
- Gold text (#E8C97A) renders on the number
- Rounded card visible
- NO warnings about unknown class names or missing stylesheet

## Test Plan

### FR1: Smoke component renders without errors
- [ ] No "Unknown class" warnings in Metro/terminal
- [ ] No "NativeWind not found" or CSS errors
- [ ] Component mounts without crash in Expo Go

### FR2: Design tokens render correctly
- [ ] `bg-background` → #0A0A0F (verified visually)
- [ ] `text-gold` → #E8C97A (verified visually)
- [ ] `bg-surface` → #13131A card background
- [ ] `rounded-2xl` → visible rounded corners
- [ ] `font-display` → SpaceGrotesk font (hero number)

### FR3: NativeWind verified flag documented
- [ ] Comment added to top of `src/components/NativeWindSmoke.tsx` confirming verified date
- [ ] OR: `NATIVEWIND_VERIFIED=true` note added to `MEMORY.md` / `.env.example`

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/metro.config.js`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tailwind.config.js`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/babel.config.js`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/global.css`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/_layout.tsx`
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(tabs)/index.tsx` (temporarily add smoke component here)

## Complexity

**S** — One new component file, one temporary modification to index.tsx, visual verification.

## FRs

1. Create `NativeWindSmoke` component using only design token className props
2. Mount it temporarily on home screen, verify in Expo Go (no crashes, tokens render)
3. Document verification result (comment or MEMORY.md update)
