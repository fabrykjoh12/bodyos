# CLAUDE.md — BodyOS

Context for Claude Code (and humans) working on this repo. Read this first in a new session.

## Current status (2026-07-19) — read before picking work

- **THE OPEN DECISION IS DESIGN.** The user finds the current UI "messy / not good" and asked for
  distinct redesign options. Two option sheets were published as artifacts:
  - Round 1 (palettes/identities, same layout): https://claude.ai/code/artifact/72c88a8f-b6fc-46a7-9dc8-974eda66cb98
  - Round 2 (completely different layouts/UX, options 6–10 — Focus Mode, Session Timeline,
    Bento, Swipe Deck, Data Terminal): https://claude.ai/code/artifact/0f769585-d459-4864-8918-71475bb6a0db
  The user rejected round 1 wholesale. **Waiting on their pick (a number, or a blend).** When they
  choose, turn it into real tokens (`tailwind.config.js`) and rebuild screens to match. Until then,
  avoid investing in new visual surface.
- **Cloud sync is LIVE on Firebase** (project `bodyos-e7372`): email/password (no confirmation
  step), Google one-tap, password reset. Config is committed in `src/lib/firebase.ts` (public by
  design). Sign-in is one tap from Home/Profile → `/account`.
- **Backlog** = `ROADMAP.md` Phase 6 (competitive positioning): program runner is the flagship gap;
  volume-landmarks v1 + rep-max estimates already shipped.
- Recent workflow: feature branch `claude/what-next-*` → PR → user merges (or asks to merge) →
  `git merge --ff-only origin/main`. Deploy is automatic on push to main. CI runs on push to main
  only — PRs get no checks, so local `typecheck && test && build` is the gate.

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
npm run test       # Vitest (121 tests: pure libs, store flows, component/integration)
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
    analytics.ts          e1rmSeries, strengthTrends, weeklyVolume, weeklyMuscleSets, muscleBalance (tested)
    volume.ts             Epley 1RM, tonnage (tested)
    volumeLandmarks.ts    MEV/MAV/MRV per muscle + classifyWeeklyVolume (pure, tested)
    repMax.ts             Inverse-Epley rep-max table (pure, tested)
    plates.ts             Barbell plate-breakdown calculator + warm-up ramp generator (pure, tested)
    prstats.ts            PR detection + liveSetPr (in-session PR check) + session totals (tested)
    history.ts            previous-performance lookup, stall counting, buildActiveSession (smart prefill)
    plan.ts               resolveTodayPlan — honest "today" state from the weekly plan (tested)
    sound.ts              Web Audio rest-timer chime (unlockAudio on Log Set gesture)
    format.ts date.ts id.ts haptics.ts
  data/
    exercises.ts          66-exercise library (stable slug ids). getExercise/requireExercise/exerciseName
    routines.ts           Starter splits (full-body-3 / upper-lower-4 / ppl-6) for applyRoutine
    seed.ts               Demo user + PPL templates + ~6 weeks of history (dates relative to now)
  store/
    repository.ts         Repository interface + LocalStorage/Memory impls + loadOrSeed. SWAP THIS for a backend.
    useStore.ts           Zustand store: all session/template/settings/progress actions. Persists via repository.
    cloudSync.ts          Optional Firebase cloud sync: auth + whole-AppData-blob push/pull with
                          last-write-wins reconciliation (localStorage stays the sync source of truth).
  lib/firebase.ts         Lazily-loaded Firebase client (public web config; Firestore rules protect data).
  components/
    ui/                   Design system: Button, NumericStepper (fluid, edge-pinned ±), Stat,
                          MetricCard, EmptyState, Sheet, Chip, SegmentedControl, IconButton, BackButton
    layout/               AppShell (mobile frame, safe-top, resume bar), BottomNav (5 tabs), ScreenHeader
    workout/              ActiveSetCard (beat-last-time target), SetGrid (beat chips, tap-to-edit),
                          PrCelebration, RestTimerBar (−15s/+15s/skip), UndoBar, DifficultyPicker,
                          ExerciseHistory, ProgressionRecommendation, WorkoutSummary, PlateBar
    progress/             StrengthChart, MuscleVolume (landmarks card), ConsistencyGrid,
                          BeforeAfterSlider, PoseGuide
    account/CloudSync.tsx Shared auth panel (email+Google sign-in, resend, reset) — used by
                          /account and Settings
    exercise/             ExerciseThumb (glyph tile), ExerciseGlyph, MuscleMap, RepMaxTable
  screens/                One file per route (incl. Account.tsx) — see routing below
  hooks/                  useInterval, useRestTimer (chime + haptic, settings-gated)
public/
  exercises/*.webp        Higgsfield exercise photos (15 of 55 so far; rest use fallback)
  icon.svg manifest.webmanifest
docs/superpowers/specs/   Design spec (2026-07-16-ui-redesign-roadmap-design.md)
```

### Routing (5-tab nav + profile in header avatar)
`/` Home · `/workouts` (+`/new`, `/routines`, `/:id`) · `/exercises` (+`/:id`) · `/stats` ·
`/progress` (+`/photos`, `/measurements`) · `/profile` · `/account` (sign-in) · `/settings` ·
`/session/:id` (Gym Mode) · `/session/:id/complete` · `/onboarding`. `/progress/strength` →
redirects to `/stats`. Screens are `React.lazy`-loaded in `App.tsx` (except Dashboard + GymMode).

## Design system (CURRENT tokens — but see "Current status": a redesign pick is pending)

Tokens live in `tailwind.config.js`; class names are stable, values are the mockup's.
Two "calm passes" already softened it (borders 7% white, accent-soft 10%, bold not extrabold,
more gap) — the user still wants a bigger change, so expect these values to be replaced once
they pick a direction. Until then:

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
  `Repository` abstraction — so a networked `Repository` can replace it with zero UI changes.
- **Optional cloud sync** (`store/cloudSync.ts`, **Firebase**): when signed in (Firebase
  email/password — no email-confirmation step — set up in Account → Sign in), `persist()` also
  mirrors the blob to Firestore doc `bodyos_app_state/{uid}` — debounced push on write, pull +
  last-write-wins reconcile on sign-in (reconcile clock = Firestore `serverTimestamp`). localStorage
  remains the synchronous source of truth; sync is a background layer, so the sync `Repository`
  interface is untouched. `photos` + `restTimer` are **not** synced (privacy + ephemeral). The
  Firebase web config is committed (public by design; **Firestore security rules** enforce
  owner-only access — see below). Paste the config into `src/lib/firebase.ts` to enable; empty
  config ⇒ sync section hides (`status: 'unconfigured'`), app stays fully offline.
  - **Firestore rules** (set in the Firebase console → Firestore → Rules):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /bodyos_app_state/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
  - We migrated off Supabase (ran out of free project slots; Supabase's default email delivery
    blocked sign-up). Firebase email/password signs users in immediately, so no email is needed.

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

## Environment notes

- **Cloud (Claude Code on the web) sessions:** `gh` is unavailable — use the GitHub MCP tools for
  PRs/merges; plain `git push` works. Set `git config user.email noreply@anthropic.com` +
  `user.name Claude` before committing (a stop-hook checks committer email). Outbound network is
  blocked (Firebase/Supabase/CDNs unreachable) — verify UI with local Playwright: build, serve
  `dist/` at `/bodyos/` with a tiny node http server, launch
  `/opt/pw-browsers/chromium-*/chrome-linux/chrome` via the global playwright at
  `/opt/node22/lib/node_modules/playwright`, screenshot at 390×844. Run scripts from the repo dir.
- **Local (user's Windows machine):** git push works via cached Git Credential Manager; an ECC
  "GateGuard" hook prompts for "facts" before the first Bash command / new-file writes — present
  the facts and retry.
- End commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Exercise visuals

The library uses **crafted glyph tiles** by default: `components/exercise/ExerciseGlyph.tsx`
(minimal per-equipment line glyphs) inside `ExerciseThumb.tsx` (muscle-tinted dark gradient tile).
Consistent across all 66 exercises, no image files required. The earlier generated 3D-mannequin
photos were blobby/inconsistent and were removed.

**Optional curated photos** can be layered back in — `ExerciseThumb` prefers a photo for any id in
its `PHOTO_IDS` set (empty by default). See `docs/exercise-photos.md` to regenerate a better set
locally (the cloud sandbox blocks the Higgsfield CDN, so the download step must run on your machine).

### Legacy photo pipeline (Higgsfield)

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

121 tests. Pure libs (progression, volume, plates, format, plan, prstats/liveSetPr, analytics,
volumeLandmarks, repMax), store flows (gymFlow: supersets, deloads, warm-ups, RIR, routines,
addExerciseToSession; repository incl. parseBackup; cloudSync reconciliation), and Testing-Library
component/integration suites (ActiveSetCard, SetGrid, Profile, GymMode on its real route). Match
these styles when adding tests. Run `npm run test`.

## How to verify a change (before claiming done)

`npm run typecheck && npm run test && npm run build`, then drive the real flow in a browser.
In cloud sessions use the Playwright pattern from "Environment notes" (serve `dist/`, screenshot
at 390×844 — this caught real bugs like the clipped Gym stepper). On the user's machine,
`npm run dev` + the in-app browser (screenshots may time out; prefer DOM checks).
