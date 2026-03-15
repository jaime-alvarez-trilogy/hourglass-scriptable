# Hourglass — Brand & Design System Guidelines

> **Version 1.0** · Last updated 2026-03-14

---

## Mission Statement

Hourglass exists to answer one question in under three seconds: *where does my week stand, and where is it heading?*

Everything in the design — the dark canvas, the prominent numbers, the colour-coded panel states — serves that goal. Data is the product. The UI is the frame. The frame should never compete with the picture.

---

## App Identity

**Name:** Hourglass
**Category:** Work dashboard / productivity
**Audience:** Crossover contractors (contributors and managers)
**Tone:** Confident, precise, premium. The app of someone who takes their output seriously.
**Reference aesthetics:** Oura Ring app · Revolut · Wise · Linear
**One-sentence design brief:** Dark glass dashboard where numbers are the hero, panels shift colour to telegraph week status at a glance, and every interaction feels satisfying and immediate.

---

## Colour System

### Philosophy

The palette is built around a near-black canvas that makes coloured data pop without visual fatigue. Semantic accent colours carry meaning — do not use them decoratively. Surface colours create depth through layering, not shadows.

### Base Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0A0A0F` | App background, screen fill |
| `surface` | `#13131A` | Default card background |
| `surfaceElevated` | `#1C1C28` | Modals, bottom sheets, popovers, active card state |
| `border` | `#2A2A3D` | Card borders, dividers, input outlines |

### Accent Colours

| Token | Hex | Semantic role |
|---|---|---|
| `gold` | `#E8C97A` | Earnings, salary, money values. Primary brand accent. |
| `cyan` | `#00D4FF` | AI usage percentage, AI-related metrics |
| `violet` | `#A78BFA` | BrainLift hours, deep-work metrics |
| `success` | `#10B981` | On-track status, completed items, positive deltas |
| `warning` | `#F59E0B` | Behind-pace status, caution states, soft alerts |
| `critical` | `#F43F5E` | Critical behind-pace, overdue approvals, urgent alerts |
| `destructive` | `#F85149` | Destructive actions (delete, reject), irreversible operations |

### Text Colours

| Token | Hex | Usage |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Hero numbers, headings, primary labels |
| `textSecondary` | `#8B949E` | Supporting labels, metadata, secondary values |
| `textMuted` | `#484F58` | Placeholder text, disabled states, fine print |

### Colour Usage Rules

1. **Gold is for money only.** Do not use `gold` for generic highlights or decoration — it means currency. When a user sees gold, they should think earnings.
2. **Cyan and violet are metrics-specific.** `cyan` = AI, `violet` = BrainLift. Do not mix them.
3. **Status colours carry meaning.** `success`, `warning`, `critical` map to week pace states. Using `success` green for a non-status purpose will confuse users.
4. **`destructive` vs `critical`:** `critical` is informational (this situation is urgent). `destructive` is action-driven (this button will permanently do something). They look similar by intention — both demand attention — but apply to different contexts.
5. **Never use pure white for large text blocks.** `#FFFFFF` is reserved for hero numbers and key labels. Body text should use `textSecondary`.
6. **Borders should whisper.** `#2A2A3D` is intentionally subtle. Cards are defined by their surface colour and internal content, not heavy outlines.

---

## Panel Gradient States

Panels (the primary dashboard card) shift their background gradient to signal week status. The gradient is the status colour at 35% opacity fading to transparent, applied top-to-bottom.

| State | Condition | Gradient |
|---|---|---|
| **On Track** | Hours pace ≥ target | `success` (`#10B981`) at 35% opacity → transparent |
| **Behind** | Hours pace 50–99% of target | `warning` (`#F59E0B`) at 35% opacity → transparent |
| **Critical** | Hours pace < 50% of target | `critical` (`#F43F5E`) at 35% opacity → transparent |
| **Crushed It** | Hours ≥ weekly target met | `gold` (`#E8C97A`) at 35% opacity → transparent |
| **Idle** | No data yet / weekend / not started | Flat `surface` (`#13131A`), no gradient |

**Implementation note:** The gradient sits behind the card content as an absolute-positioned layer. It should animate smoothly when transitioning between states using the `springPremium` preset (see Animation Philosophy).

---

## Typography System

### Three-Tier Type Scale

Hourglass uses three typefaces, each with a specific purpose tier. **Never mix tiers casually.** If something feels like a number or metric, it is Display. If it is navigation or an action, it is Sans. If it explains or elaborates, it is Body.

| Tier | Typeface | Purpose |
|---|---|---|
| **Display** | Space Grotesk | Hero numbers, metric values, large headings |
| **Sans** | Inter | UI labels, navigation, buttons, form inputs, tab labels |
| **Body** | Plus Jakarta Sans | Descriptive text, AI insights, empty states, onboarding copy |

### Type Scale

| Name | Size (px) | Line height | Typical weight | Notes |
|---|---|---|---|---|
| `3xl` | 36 | 40 | Bold (700) | Hero number (e.g., weekly hours large display) |
| `2xl` | 28 | 34 | Bold (700) | Section hero metric |
| `xl` | 22 | 28 | SemiBold (600) | Card headline, large label |
| `lg` | 18 | 26 | SemiBold (600) | Subsection heading, prominent value |
| `md` | 16 | 24 | Regular (400) / Medium (500) | Body, primary UI label |
| `sm` | 14 | 20 | Regular (400) | Secondary label, metadata |
| `xs` | 12 | 16 | Regular (400) | Caption, pill badge, fine print |

### Weight Usage

- **Bold (700):** Hero numbers, `3xl`/`2xl` Display only
- **SemiBold (600):** Card titles, key metric labels, button text
- **Medium (500):** Active tab labels, slightly emphasised UI copy
- **Regular (400):** All body and secondary text
- **Light (300):** Available in Plus Jakarta Sans only — use sparingly for onboarding prose where a quieter voice is intentional

### Typography Rules

1. Numeric values always use **Space Grotesk**. A salary figure in Inter looks wrong — the letter spacing and number shapes are designed for prose, not data.
2. Button labels always use **Inter SemiBold**. They should feel actionable, not decorative.
3. Insight copy (AI summaries, week-end reflections, empty state messages) always use **Plus Jakarta Sans**. The slightly warmer letterforms soften analytical content.
4. Do not use more than two typefaces in a single view. Pick Display + Sans or Sans + Body — not all three simultaneously.
5. Tabular figures: use `fontVariant: ['tabular-nums']` on all metric displays so numbers don't jump width as they change.

---

## Spacing Philosophy

Hourglass uses the **Tailwind default 4px base scale** with no modifications. This ensures predictable, learnable spacing that any contributor can apply without referencing a custom chart.

**Key spacing habits:**

- Card internal padding: `p-5` (20px) or `p-6` (24px) — never less than `p-4`
- Gap between cards/sections: `gap-4` (16px) to `gap-6` (24px)
- Gap between a label and its value within a card: `gap-1` or `gap-2`
- Screen horizontal padding: `px-4` (16px) — consistent edge-to-edge breathing room
- Stack spacing within a list: `gap-3` (12px)

**The airy principle:** If a layout looks dense, add spacing before removing content. Premium apps breathe. Numbers need white space around them to feel authoritative.

---

## Border Radius Rules

| Context | Token | px value |
|---|---|---|
| Cards, panels, large containers | `rounded-2xl` | 16px |
| Buttons, inputs, small modals | `rounded-xl` | 12px |
| Pills, status badges, small chips | `rounded-full` | 9999px |
| Inner elements within cards | `rounded-lg` | 8px |

**Rule:** Do not use `rounded-md` (6px) or smaller in the app — it reads as a browser default, not a design decision. The minimum intentional radius is `rounded-lg` (8px).

---

## Component Personality

### Card-First Layout

Every major data unit lives in a card. Cards are the atomic unit of the dashboard. They:
- Have a `surface` (`#13131A`) background
- Use `border` (`#2A2A3D`) with 1px width
- Use `rounded-2xl` (16px) radius
- Have `p-5` or `p-6` internal padding
- May optionally carry a panel gradient overlay for status-driven panels

### Airy Density

The layout is generous, not compact. This is a dashboard you open at the start and end of a session — it is not a power-user tool requiring maximum information density. Every card should feel like it has room to breathe.

### Number Hierarchy

Within any card, there should be a clear visual hierarchy:
1. **Hero value** — large, Display typeface, `textPrimary`
2. **Supporting metric** — medium, Sans or Display, `textSecondary`
3. **Label / caption** — small, Sans, `textMuted`

The eye should land on the number first, then find context from the label below.

---

## Animation Philosophy

Animation serves communication, not entertainment. Every animated element should feel like it has physical weight and intention.

### Two Animation Personalities

**Springs → transitions, interactions, structure**
Cards appearing, panels opening, modals sliding in, navigation transitions. Springs feel alive because they simulate physics — the slight overshoot tells the user something arrived, not just appeared. Use springs for anything that moves through space.

**Timing curves → data, charts, fills**
Progress bars filling, chart bars growing, percentage counters. These should feel precise and satisfying — like a gauge settling to its reading. Springs on data fills feel uncontrolled. Ease-out timing curves on bar charts feel like a measurement landing on truth.

### Personality Calibration

- **Snappy:** Fast, decisive, no-nonsense. Navigation, small UI responses.
- **Bouncy:** Alive, confident, a touch of delight. Cards appearing, panel expansion.
- **Premium:** Unhurried, smooth, authoritative. Hero panels, modal sheets. The "Revolut card flip" feeling.

### Animation Rules

1. Never animate colour alone — pair colour transitions with a subtle scale or opacity shift to make the change feel intentional.
2. Panel gradient state changes use `springPremium` — they are the most emotionally significant transition in the app.
3. List items that enter staggered use `springBouncy` with a 50ms delay multiplied by index, capped at 300ms total stagger.
4. Button press feedback uses `timingInstant` scale (0.96) — immediate, tactile.
5. Loading skeletons pulse with `timingSmooth` opacity — slow enough to be calm, not anxious.

---

## Do's and Don'ts

### Do
- Lead with the number, follow with the label
- Use status colours only for their designated semantic meaning
- Keep cards padded and spacious
- Use Space Grotesk for every metric value
- Animate with purpose — ask "does this animation communicate something?"
- Keep the background dark; let accent colours do the work of guiding attention
- Use `tabular-nums` on all animated counters and changing values

### Don't
- Don't use gold for non-earnings highlights
- Don't put more than one hero number per card (there can be supporting values, but only one hero)
- Don't use gradients decoratively — gradient panels have semantic meaning (week status)
- Don't use `rounded-md` or smaller — anything below `rounded-lg` looks like a default
- Don't spring-animate chart fills or progress bars — use timing curves
- Don't use light text on light surfaces, even at low opacity
- Don't stack more than three typefaces in a single view
- Don't animate without considering reduced-motion users — all animations should have a `useReducedMotion` fallback that shows the end state instantly

---

## Panel State Reference Table

| State | Token | Hex | Gradient opacity | Trigger condition |
|---|---|---|---|---|
| On Track | `success` | `#10B981` | 35% | Current pace ≥ weekly target pace |
| Behind | `warning` | `#F59E0B` | 35% | Current pace 50–99% of target pace |
| Critical | `critical` | `#F43F5E` | 35% | Current pace < 50% of target pace |
| Crushed It | `gold` | `#E8C97A` | 35% | Weekly hour target fully met |
| Idle | — | — | 0% (no gradient) | No data, weekend, week not started |

**Gradient direction:** Top to bottom. The status colour appears at the top of the panel (full 35% opacity) and fades to fully transparent by the bottom third. This means the panel content in the lower portion reads on a clean dark surface.

---

*Hourglass Design System v1.0 — maintained alongside the codebase in `BRAND_GUIDELINES.md`*
