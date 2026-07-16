# BodyOS — UI Redesign & Product Roadmap (Design Spec)

Date: 2026-07-16
Status: Approved by user (brainstorming session)
Source of truth for visuals: `Dashboard Phone.dc.html` design file (user-provided mockup; tokens extracted below)

## Goal

Make BodyOS look like a deliberately designed training app instead of an AI-generated
template, by adopting the user's mockup design system across the whole app, and define
the phased roadmap to a "real app" (PWA, polish, backend sync, deeper training features).

Decisions made with the user:
- **Language: English** (mockup is Norwegian; we keep its visuals, not its copy).
- **Navigation: 5 tabs** — Home · Workouts · Exercises · Stats · Progress. Profile moves
  to an avatar button in the Home header.
- **Approach: full design-system adoption** (approach B) — not a token-only swap, not a
  dashboard-only clone.

## Why the current UI reads "AI-generated" (diagnosis)

1. Generic ingredients: Inter, safe blue accent, soft glows.
2. Monotone layout: every screen is a stack of same-shaped cards.
3. Missing craft: no hairline borders, no eyebrow labels, no reference-data color, no
   distinct numeral treatment.

The mockup solves all three; this spec ports its system.

## 1. Design tokens (single source of truth → `tailwind.config.js`)

### Colors

| Token | Value | Use |
|---|---|---|
| black-950 | `#08090B` | app backdrop |
| black-900 | `#0E1013` | page surface |
| black-850 | `#14171B` | raised surface |
| black-800 | `#1B1F24` | card |
| black-750 | `#21262C` | input / hover |
| black-700 | `#2A3037` | pressed / active |
| black-600 | `#363D45` | strong divider |
| gray-50/300/500 | `#F4F6F8` / `#A7AFB9` / `#656E79` | text primary / secondary / muted |
| line-subtle/line/line-strong | white @ 6% / 10% / 16% | hairline borders |
| volt-500 | `#CDFB45` | THE accent: primary action, PRs, active tab |
| volt-400 / volt-600 | `#DAFF66` / `#B4E82A` | hover / press |
| volt-tint | volt @ 14% | faint fills behind volt content |
| text-on-volt | `#0A0C05` | ink on volt fills |
| ice-500 | `#5FA8FF` (+ tint @14%) | ONLY for "last time" reference data |
| success / warn / danger | `#4ADE80` / `#FBBF24` / `#FB5A5A` | semantic (+14% tints) |

Rules: volt is the only brand accent; glow (`0 0 0 1px volt-600, 0 6px 20px volt@35%`)
is reserved for the primary action and PR moments. Ice never decorates — it means
"reference data" and nothing else.

### Typography

- **Archivo** (400–800) — display + UI. **Geist Mono** (400–700) — every numeral in the
  app (weights, reps, volume, timers, deltas, list dates). Self-hosted via `@fontsource`
  packages (no CDN; PWA-ready).
- Scale (px): display 48 · h1 34 · h2 26 · h3 21 · title 18 · body 15 · sm 13 ·
  label 12 · micro 11. Stat sizes (mono): 40 / 28 / 20.
- Eyebrow labels: 11px / 700 / uppercase / 0.06–0.1em tracking — every card label.
- Tracking: display −0.03em; tight −0.02em.

### Shape, spacing, motion

- Radius: 6 / 10 / 14 (inputs, chips) / 18 (cards) / 24 (sheets) / pill.
- Spacing: 4px base; 16px screen gutters; 12px card stack gap; tab bar 64px.
- Touch: 48px minimum hit target; 52px primary buttons; 48px numeric fields.
- Shadows: subtle ambient (`0 2px 8px black@35%` cards); volt glow per rule above.
- Motion: ease-out `cubic-bezier(0.22,1,0.36,1)`; 120/200/320ms; bar-grow animation on
  charts; respects reduced motion.

## 2. Navigation

- Bottom tab bar: 64px, `rgba(14,16,19,0.85)` + 16px backdrop blur, top hairline.
  5 tabs with mockup's outline icons; active = volt icon + label.
- Tabs → routes: Home `/` · Workouts `/workouts` · Exercises `/exercises` ·
  Stats `/stats` (new screen) · Progress `/progress`.
- Profile/Settings: avatar button in Home header → `/profile` (route kept, no tab).
- `/progress/strength` redirects to `/stats` (analytics move there); Progress keeps
  photos + body data.

## 3. Dashboard (rebuilt to mockup, English copy)

Anatomy top-to-bottom (all data from existing store selectors/analytics):

1. **Header**: "Good morning" greeting (13px muted) + user name (Archivo 30/800);
   right side: streak pill (flame icon + "N weeks" in mono, volt tint) and avatar button.
2. **Today's session hero**: card w/ **volt border**, volt pill badge "TODAY'S SESSION"
   (10px/800/uppercase, text-on-volt), "Last done N days ago" (mono 11px muted),
   workout name (26/800), focus line, full-width 52px volt **Start session** button
   w/ play icon. Resume state if a session is active.
3. **KPI grid 2×2**: Week volume · Sessions (month) · Est. 1RM top-lift · New PRs.
   Eyebrow label, mono 24px value + unit, green ↑ delta + context note.
4. **Weekly volume**: eyebrow + mono 26px total; Week/Month/Year segmented control
   (28px, active = surface-active); 7-day bar chart, 120px, best day volt, others
   black-600, rest days input-surface; mono day letters.
5. **Est. 1RM sparkline**: top lift; +% badge (green, mono); mono 22px current value;
   volt polyline, dots, last dot filled volt r=4.
6. **Muscle balance**: eyebrow; per-muscle 7px progress bars (volt for top groups,
   black-600 rest), mono % labels. Data: from sessions' muscle-group set counts.
7. **Personal records**: uppercase section header + volt "See all"; rows: 40px volt-tint
   trophy square, lift name (15/700), mono value line, "when" muted.
8. **Recent sessions**: rows: name + optional volt "N PR" pill, date · duration muted;
   right: mono volume + sets.

## 4. Extrapolation rules for all other screens

The mockup covers only the dashboard; every other screen is restyled by rule:

- One volt primary action per screen, 52px, text-on-volt ink. Everything else neutral.
- All numerals Geist Mono; all card labels eyebrow-style; hairline borders everywhere;
  no decorative gradients or glow.
- "Last time" / previous-performance values in ice blue, today's values in white.
- **Gym Mode** (layout keeps its validated structure): huge mono weight/reps; volt
  52px Log Set; rest timer with volt progress bar; completed sets get success check,
  PR sets get volt treatment + glow; difficulty picker keeps semantic colors;
  history panel shows ice reference values.
- **Workout completion**: stats grid mono; PR celebration card is the sanctioned
  volt-glow moment; recommendation cards keep semantic tints.
- **Stats (new screen)**: absorbs strength charts + adds weekly volume trend and
  muscle balance over time. Recharts restyle: volt series, `black-600` grid, mono
  11px ticks, dark tooltip (`black-750`, hairline border).
- Workouts / Exercises / Progress / Profile / Settings / Onboarding: same card
  anatomy; onboarding options use volt selected-state (border + tint) instead of blue.

## 5. Roadmap

- **Phase 1 — UI overhaul** (this spec, sections 1–4). ~2–3 sessions.
  Done when: every screen (15 incl. NotFound) uses the new system; zero references
  to the old blue accent or Inter; core flow re-verified in browser; tests +
  typecheck green.
- **Phase 2 — Real-app feel** (~1 session): route-level code splitting + vendor
  chunking (target < 250kB initial, charts lazy); then PWA — manifest, icons
  (volt-on-black), service worker (offline shell + cached chunks), installable from
  GitHub Pages. Split BEFORE service worker so caching operates on small chunks.
- **Phase 3 — Polish** (~1 session): screen transitions, list/press micro-interactions,
  refined empty states, onboarding polish, haptics coverage, safe-area audit on a
  real phone.
- **Phase 4 — Accounts & sync** (~2 sessions): Supabase free tier — auth (email/OAuth),
  Postgres tables mirroring the TS domain model, Storage bucket for progress photos
  (private). Implement `SupabaseRepository` behind the existing `Repository`
  interface; localStorage demotes to offline cache with background sync.
- **Phase 5 — Deeper training features** (prioritize later): plate calculator,
  warm-up set generator, supersets, optional RPE/RIR entry (types exist), body
  measurements UI, week planning / deload scheduling.

## Non-goals (this effort)

- No Norwegian/i18n layer (English only, per user decision).
- No new training features inside Phase 1 (visual parity first).
- No backend work before Phase 4.

## Risks / notes

- Archivo Expanded isn't a separate @fontsource package; use Archivo with
  `font-stretch` where supported, fallback to regular Archivo (mockup itself ships
  Archivo as the stand-in for an unlicensed brand font).
- Bundle grows with two font families → subset to latin, weights 400–800 only;
  code splitting in Phase 2 offsets this.
- The 5-tab change moves analytics out of Progress; keep a redirect so old links work.
