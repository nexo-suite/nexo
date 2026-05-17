# Design System

Nexo's visual language. Two contexts: the **landing page** (light, editorial) and the **apps** (mobile-first PWAs, dark-mode-aware). Each app has its own accent color but shares structural tokens.

> **TL;DR** — Landing: five surface layers, editorial typography, scroll reveals.
> Apps: mobile-first, 448px max-width, OKLch color system, bottom sheet forms.

---

## 1. Color

### Landing page tokens

Defined in `apps/landing/src/app.css` inside `@theme {}`. **Light theme only.**

| Token               | Value     | Use                      |
| ------------------- | --------- | ------------------------ |
| `--color-bg-0`      | `#fafaf9` | Page background          |
| `--color-bg-1`      | `#f4f4f2` | Inset wells, code blocks |
| `--color-bg-2`      | `#ececea` | Status pills, chips      |
| `--color-surface-1` | `#ffffff` | Cards                    |
| `--color-surface-2` | `#fbfbfa` | Card hover, modals       |

### App tokens (finance example)

Defined in each app's `src/app.css`. Uses OKLch for perceptual uniformity.

| Token             | Value                  | Use                   |
| ----------------- | ---------------------- | --------------------- |
| `--color-primary` | `oklch(0.54 0.22 264)` | Brand accent          |
| `--color-income`  | `oklch(0.62 0.17 142)` | Green — income items  |
| `--color-expense` | `oklch(0.59 0.2 27)`   | Red/coral — expenses  |
| `--color-debt`    | `oklch(0.65 0.18 47)`  | Amber — debt items    |
| `--color-surface` | `oklch(1 0 0)`         | White card background |
| `--color-border`  | `oklch(0.91 0 0)`      | Default borders       |

### Per-app accents

| App     | Accent    | CSS variable     |
| ------- | --------- | ---------------- |
| Finance | `#16a34a` | `--color-accent` |
| Admin   | `#3b82f6` | `--color-accent` |
| Auth    | `#16a34a` | `--color-accent` |
| Landing | `#16a34a` | `--color-accent` |
| Gym     | `#f97316` | (planned)        |

**Rules:**

1. On light surfaces, mix accent with black for text: `color-mix(in oklab, var(--color-accent) 80%, #000)`.
2. Accent fills reserved for primary buttons and the brand mark.
3. Never use raw accent for body copy.

---

## 2. Typography

**Inter Variable** for all UI text. **JetBrains Mono** for metadata, version tags, labels.

### Landing page scale

| Use        | Size                    | Weight | Tracking |
| ---------- | ----------------------- | ------ | -------- |
| Hero title | `clamp(64px,9vw,112px)` | 600    | -0.04em  |
| Section h2 | 24px                    | 600    | tight    |
| Body       | 15px                    | 400    | 0        |
| Labels     | 11px (mono)             | 500    | 0.12em   |

### App scale (mobile)

| Use        | Size | Weight |
| ---------- | ---- | ------ |
| Page title | 2xl  | bold   |
| Section    | xs   | 600    |
| Body       | 14px | 400    |
| Labels     | 10px | 500    |

**Rules:** Max font-weight is 600. No gradient text in apps (landing hero only).

---

## 3. Spacing

4px base. Tailwind v4 derives `p-4` = `16px` from `--spacing: 4px`.

- `4 / 8 / 12` — inside chips, pills, small gaps
- `16 / 24` — card internals, section gaps
- `28 / 32` — card padding (landing)
- `48 / 64` — section padding (landing)

Apps use tighter spacing — `px-4 pt-4 pb-6` is the standard page padding.

---

## 4. Radius

| Token          | Px    | Use                            |
| -------------- | ----- | ------------------------------ |
| `--radius-sm`  | 4-6   | Tags, brand mark               |
| `--radius-md`  | 8-10  | Buttons, input fields          |
| `--radius-lg`  | 12-14 | Cards (apps), modals           |
| `--radius-xl`  | 16-20 | Cards (landing), bottom sheets |
| `--radius-2xl` | 24-28 | Hero panels, large cards       |
| `999px`        |       | Pills, dots, nav indicators    |

---

## 5. Landing page card anatomy

```
┌─────────────────────────────────────────┐
│  [icon-tile]              [status-pill] │
│                                         │
│  H3 App name                           │
│  Body description                      │
│                                         │
│  [meta · mono · faint]                 │
└─────────────────────────────────────────┘
   surface-1  +  border-default  +  radius-xl  +  padding 28
```

**Hover:** translateY(-2px), border tints to accent, radial accent wash follows cursor.

**Locked state:** opacity 0.55, no hover lift.

---

## 6. App card anatomy (finance)

```
┌─────────────────────────────────────────┐
│  [emoji] Name              [amount]     │
│  [secondary info]          [action btn] │
└─────────────────────────────────────────┘
   bg-surface  +  border-border  +  rounded-lg  +  px-4 py-3
```

Cards in apps are compact (no min-height), list-oriented, and use semantic color for amounts (income green, expense red, debt amber).

---

## 7. App layout pattern

All PWA apps follow the same shell structure:

```
┌────────────────────────┐
│      Fixed topbar       │  height: var(--topbar-h) + safe-area-top
├────────────────────────┤
│                         │
│     Scrollable body     │  flex: 1, overflow-y: auto
│     (max-width: 448px)  │  padding-top: topbar, padding-bottom: tabbar
│                         │
├────────────────────────┤
│    Fixed bottom tabbar  │  height: var(--tabbar-h) + safe-area-bottom
└────────────────────────┘
```

Key patterns:

- `overscroll-behavior-y: contain` prevents pull-to-refresh in PWA
- Backdrop blur on both bars for content scroll-through
- Navigation progress bar (2px, accent color) on route transitions
- Bottom sheets for all forms (drag-to-dismiss)

---

## 8. Buttons

| Variant   | Background   | Text    | Use                 |
| --------- | ------------ | ------- | ------------------- |
| Primary   | accent color | white   | One per view (CTA)  |
| Secondary | transparent  | primary | Alternative actions |
| Ghost     | transparent  | muted   | Cancel, dismiss     |

In apps, action buttons are compact: `px-3 py-1.5 text-xs font-medium rounded-md`.

---

## 9. Motion

| Token             | Duration | Use                          |
| ----------------- | -------- | ---------------------------- |
| `--duration-fast` | 150ms    | Hover color, link gap        |
| `--duration-base` | 240ms    | Card lift, panel transitions |
| `--duration-slow` | 480ms    | Scene transitions, big fades |

Eases: `cubic-bezier(0.2, 0.7, 0.2, 1)` (out), `cubic-bezier(0.65, 0, 0.35, 1)` (in-out).

**No overshoot. No bounce.** Confident, not goofy.

### Landing-specific

- **Reveal on scroll** — sections start at `opacity: 0; translateY(14px)`, animate in on intersection.
- **Live dot pulse** — accent dots pulse opacity on 2.4s cycle.

### App-specific

- **Bottom sheet** — slides up with drag-to-dismiss momentum detection.
- **Nav progress** — thin accent bar animates during route transitions.
- **Update prompt** — slides in from bottom when new SW version detected.

---

## 10. Backgrounds

Landing hero uses a grid pattern with accent glow:

```css
background:
	radial-gradient(accent 11% at top center, transparent),
	56px line grid (rgba 4%);
mask-image: radial-gradient(ellipse, fade to edges);
```

App pages use flat `--color-bg-1` (dark: near-black, light: warm gray).

---

## 11. Dark mode

Apps support both light and dark mode via Tailwind's `dark:` prefix. The finance app uses `dark:bg-red-950/30` patterns for semantic backgrounds.

Landing page is **light only** — no dark mode toggle.

---

## 12. Adding a new app

1. Pick an accent distinct from existing apps. Must pass 4.5:1 contrast against white.
2. Set `--color-accent` in the app's `app.css`.
3. Copy the shell structure (topbar + scrollable body + tabbar) from admin or finance.
4. Use the same PWA manifest pattern with app-specific name, icon, and theme_color.
5. Add the app to the landing page `apps` array with appropriate i18n messages.

---

_Last updated: 2026-05-14 · Nexo v0.8.4_
