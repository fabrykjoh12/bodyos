# CLAUDE.md — BodyOS

Context for Claude Code (and humans) working on this repo. Read this first in a new session.

## What this is

**BodyOS** — a mobile-first workout tracker. The whole product is built around one promise:

> Track every set in seconds, and always know exactly what to beat next.

The **workout-tracking flow (Gym Mode)** is the most important part of the app. Dashboards,
analytics, and photos support it — they never crowd it. Design goal: a serious, premium
training tool, **not** a generic AI-looking dashboard.

- **Live:** https://fabrykjoh12.github.io/bodyos/ (GitHub Pages, private repo)
- **Repo:** https://github.com/fabrykjoh12/bodyos (owner `fabrykjoh12`, branch `main`)
- **Local dir:** `C:\Users\fabry\Documents\Koding\Projekt\BodyOs`

## Commands

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173  (base "/" in dev)
npm run test       # Vitest (27 tests: progression engine, volume/1RM, store flow)
npm run typecheck  # tsc -p tsconfig.json (strict, noUncheckedIndexedAccess)
npm run build      # tsc -b && vite build  (base "/bodyos/", emits dist/ + 404.html)
```

Deploy: **push to `main`** → GitHub Actions (`.github/workflows/deploy.yml`) runs tests +
build and publishes to Pages. No manual step.

## Stack

React 18 · TypeScript (strict) · Vite 5 · Tailwind 3 · Zustand 5 · React Router 6 ·
Recharts 2 · Lucide · Vitest · `@fontsource-variable` (Archivo, Geist Mono).

## Architecture / where things live

```
src/
  types/index.ts          Domain model. Templates (the plan) are SEPARATE from
                          sessions (what happened) — never mutate history.
  lib/
    progression.ts        Double-progression engine (pure, tested). Every rec has a reason.
    analytics.ts          e1rmSeries, strengthTrends, weeklyVolume, last7DaysVolume, muscleBalance
    volume.ts             Epley 1RM, tonnage (tested)
    prstats.ts            PR detection + session totals
    history.ts            previous-performance lookup, stall counting, buildActiveSession (smart prefill)
    format.ts date.ts id.ts haptics.ts
  data/
    exercises.ts          55-exercise library (stable slug ids). getExercise/requireExercise/exerciseName
    seed.ts               Demo user + PPL templates + ~6 weeks of history (dates relative to now)
  store/
    repository.ts         Repository interface + LocalStorage/Memory impls + loadOrSeed. SWAP THIS for a backend.
    useStore.ts           Zustand store: all session/template/settings/progress actions. Persists via repository.
    cloudSync.ts          Optional Supabase cloud sync: auth + whole-AppData-blob push/pull with
                          last-write-wins reconciliation (localStorage stays the sync source of truth).
  lib/supabase.ts         Lazily-loaded Supabase client (public URL + publishable key; RLS protects data).
  components/
    ui/                   Design system: Button, NumericStepper, Stat, MetricCard, EmptyState,
                          Sheet, Chip, SegmentedControl, ProgressRing, IconButton, BackButton
    layout/               AppShell (mobile frame + resume bar), BottomNav (5 tabs), ScreenHeader
    workout/              ActiveSetCard, SetGrid, RestTimerBar, UndoBar, DifficultyPicker,
                          ExerciseHistory, ProgressionRecommendation, WorkoutSummary
    progress/             StrengthChart, BeforeAfterSlider, PoseGuide
    exercise/ExerciseThumb.tsx   Exercise photo w/ muscle-tinted fallback
  screens/                One file per route (see routing below)
  hooks/                  useInterval, useRestTimer
public/
  exercises/*.webp        Higgsfield exercise photos (15 of 55 so far; rest use fallback)
  icon.svg manifest.webmanifest
docs/superpowers/specs/   Design spec (2026-07-16-ui-redesign-roadmap-design.md)
```

### Routing (5-tab nav + profile in header avatar)
`/` Home · `/workouts` (+`/new`, `/:id`) · `/exercises` (+`/:id`) · `/stats` · `/progress`
(+`/photos`) · `/profile` · `/settings` · `/session/:id` (Gym Mode) ·
`/session/:id/complete` · `/onboarding`. `/progress/strength` → redirects to `/stats`.
Screens are `React.lazy`-loaded in `App.tsx` (except Dashboard + GymMode).

## Design system (this is what makes it not look AI-generated — keep it)

Tokens live in `tailwind.config.js`; class names are stable, values are the mockup's.

- **Volt `#CDFB45` is the ONLY accent** — primary action, PRs, active tab. Dark ink
  (`text-ink` = `#0A0C05`) on volt fills (never `text-white` on volt).
- **Ice `#5FA8FF` (`text-ice`) means "reference / last-time data" ONLY** — never decorative.
- Near-black surface stack: `base #0E1013` < `surface` < `surface-2` < `surface-3`; hairline
  borders are white-alpha (`border-line`).
- **Fonts:** Archivo (display/UI) + Geist Mono. **Every numeral uses `.tnum`** (maps to Geist
  Mono) — the single strongest "training tool" signal. Prose stays Archivo.
- Card labels are eyebrow style: `.label-tiny` (11px, bold, uppercase, tracked).
- **One volt primary action per screen.** Glow (`shadow-accent-glow`) is reserved for the
  primary action / PR celebration moments only.
- 48px min touch targets, 52px primary buttons, mono numbers dominate the active-set screen.

## Data & state

- `AppData` (persisted root) = user, templates, sessions (history), activeSession, PRs,
  photos, measurements, weeklyPlan, streakDates, restTimer.
- **Active session + rest timer survive refresh** (persisted). Undo is available after logging.
- Store persists the whole `AppData` slice to `localStorage` after every mutation, through the
  `Repository` abstraction — so a `SupabaseRepository` can replace it with zero UI changes.
- **Optional cloud sync** (`store/cloudSync.ts`): when signed in (Supabase email/password, set up
  in Settings → Account & Sync), `persist()` also mirrors the blob to `public.bodyos_app_state`
  (one `jsonb` row per user, owner-only RLS) — debounced push on write, pull + last-write-wins
  reconcile on sign-in. localStorage remains the synchronous source of truth; sync is a background
  layer, so the sync `Repository` interface is untouched. `photos` + `restTimer` are **not** synced
  (privacy + ephemeral). Supabase project `bvqvturqupbggxaeihvi` is **shared** with another app —
  only the `bodyos_*` tables are ours; never touch the rest. The publishable key is committed
  (public by design; RLS enforces access).

## Gotchas (things that have bitten us — don't repeat)

1. **GitHub Pages base path.** Vite `base` is `/bodyos/` in build (`vite.config.ts`), and
   `BrowserRouter` uses `basename={import.meta.env.BASE_URL}` (main.tsx). A `404.html` copy of
   index.html gives SPA deep-link fallback. Pages **Build source must be "GitHub Actions"**
   (not "deploy from a branch" — that serves raw source → blank page).
2. **Zustand selectors must NOT return freshly-derived arrays** (`.filter`/`.map` inline) —
   it triggers React's getSnapshot loop and crashes the screen. Select the raw slice and derive
   with `useMemo` (bit us in WorkoutComplete/Workouts).
3. **`tsc -b` type-checks `vite.config.ts`** via `tsconfig.node.json`, so `@types/node` must be
   installed. `vite build` alone doesn't catch this; `npm run build` (CI) does.
4. Build artifacts `vite.config.js/.d.ts` + `*.tsbuildinfo` are git-ignored — don't commit them.
5. Private repo + GitHub Pages needs GitHub Pro (site is currently serving, so it's fine).

## Environment notes (this machine)

- **git push works** over HTTPS via the cached Git Credential Manager token (account
  `fabrykjoh12`). `gh` CLI is **not installed**; the repo was created via the GitHub REST API
  using that token. The GitHub MCP has no token.
- An **ECC "GateGuard" hook** prompts for "facts" before the first Bash command and before each
  new-file write. It re-arms per session. Just present the requested facts and retry (an
  immediate retry of a denied write passes). Writes to `.claude/settings*.json` bypass it.
- End commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Exercise photos (Higgsfield)

Exercise images are neutral 3D-figure illustrations generated via the **Higgsfield MCP**
(`generate_image`, model `nano_banana_pro`, ~2 credits each). Style prompt template:

> "Minimalist 3D illustration of a single neutral grey mannequin-style figure performing
> {EXERCISE}, clean matte studio render, dark charcoal background #0E1013, subtle lime-green
> #CDFB45 rim lighting, centered composition, no text, no logos, premium fitness app icon style"

Pipeline: generate → `show_generations` for the `minUrl` (webp) → `curl` into
`public/exercises/<exercise-id>.webp`. `ExerciseThumb` references `${BASE_URL}exercises/<id>.webp`
and falls back to a muscle-tinted tile on 404. **15 of 55 exercises have photos**; the rest use
the fallback. See `ROADMAP.md` for the remaining list.

## Testing

High-risk logic is covered: progression rules, 1RM/volume, unit conversion, and the full store
flow (start → log → copy-forward → undo → complete-with-recommendation). Run `npm run test`.
No component/E2E tests yet (Testing Library is installed).

## How to verify a change (before claiming done)

`npm run typecheck && npm run test && npm run build`, then run `npm run dev` and drive the flow
in a browser. Note: in the in-app Browser pane, screenshots often time out — use `read_page` /
`javascript_tool` to confirm DOM, fonts, and colors instead. Synthetic clicks sometimes don't
fire; drive via a real DOM `.click()` in `javascript_tool` when needed.
