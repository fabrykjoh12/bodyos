# CLAUDE.md — BodyOS

Context for Claude Code (and humans) working on this repo. Read this first in a new session.

## Current status (2026-07-24) — read before picking work

- **THE REDESIGN SHIPPED**. The "precision instrument" redesign (deeper graphite palette,
  display type scale, physical gradient cards, floating pill nav, staggered motion + count-ups,
  cinematic Workout Complete) is live. See "Design system" below. Verify UI changes with
  `node scripts/shot.mjs <outdir>` (builds must exist in `dist/`; serves at /bodyos/ and
  screenshots key screens + the full gym flow at 390×844).
- **Normalized per-entity sync is LIVE** on Firebase (project `bodyos-e7372`), replacing the
  earlier whole-blob last-write-wins design — see "Data & state" below for the architecture.
  Email/password (no confirmation step), Google one-tap, password reset all still work the same
  way from the user's perspective; sign-in is one tap from Home/Profile → `/account`.
  **Console action still needed:** deploy `firestore.rules` so the live rules match VCS
  (`npx firebase-tools deploy --only firestore:rules`) — the new collections' rules are
  additive and don't touch the still-readable legacy blob until then.
- **Quality gates added**: ESLint + Prettier (`npm run lint` / `format:check`), a Lighthouse
  budget (`npm run lighthouse`), and a real Firebase emulator test suite
  (`npm run test:emulator`) all run in CI now, alongside typecheck/test/build/e2e.
- **Backlog** = `ROADMAP.md` Phase 6 (competitive positioning): program runner is the flagship
  gap, deliberately still gated on the sync work above landing solidly (see `docs/audit-2026-07-20.md`
  #8's remaining items — a conflict-shelf priority refinement, not a blocker for using the app).
- Recent workflow: feature branch `claude/what-next-*` → PR → user merges (or asks to merge) →
  `git merge --ff-only origin/main`. Deploy is automatic on push to main. CI now runs lint,
  typecheck, unit tests, the Firebase emulator suite, build, E2E, and Lighthouse on every PR and
  push to main.

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
npm run dev            # Vite dev server → http://localhost:5173  (base "/" in dev)
npm run test           # Vitest (205 tests: pure libs, store flows, component/integration)
npm run test:emulator  # Firebase emulator suite (38 tests: rules, sync engine, migration) — needs Java
npm run typecheck      # tsc -p tsconfig.json (strict, noUncheckedIndexedAccess)
npm run lint           # ESLint (flat config)
npm run format         # Prettier --write (format:check for CI-style verification)
npm run build          # tsc -b && vite build  (base "/bodyos/", emits dist/ + 404.html)
npm run test:e2e       # Playwright flows against the built dist/ (scripts/e2e.mjs)
npm run lighthouse     # Lighthouse budget against the built dist/ (scripts/lighthouse.mjs)
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
    cloudSync.ts          Optional Firebase cloud sync: auth + normalized per-entity sync (see
                          syncDiff/syncQueue/syncEngine/syncMigration below). localStorage stays
                          the sync source of truth.
    syncDiff.ts            lib/ — pure entity-level diff between two AppData snapshots (pure, tested).
    syncQueue.ts            IndexedDB offline mutation queue + per-entity rev baseline (profile-scoped).
    syncEngine.ts           pushMutation/drainQueue/pullRemote/catchUpNeverSynced — optimistic-
                          concurrency push+pull against the normalized Firestore collections.
    syncMigration.ts        One-time idempotent fan-out from the legacy whole-blob doc.
    syncPull.ts             lib/ — pure merge of a PullPatch into local AppData (pure, tested).
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

### Routing (5-tab nav: Home · Workouts · Progress · Exercises · Profile)
`/` Home · `/workouts` (+`/new`, `/routines`, `/:id`) · `/exercises` (+`/:id`) ·
`/progress` (single analytics tab: stats grid, strength chart, muscle volume + map,
consistency, PRs; +`/photos`, `/measurements`) · `/profile` · `/account` (sign-in) ·
`/settings` · `/session/:id` (Gym Mode) · `/session/:id/complete` · `/onboarding`.
`/stats` and `/progress/strength` redirect to `/progress` (Stats was merged 2026-07-20 —
one analytics tab; Home is intentionally lean: masthead, hero, glance strip, weekly
volume, recent sessions, nothing else). Screens are `React.lazy`-loaded in `App.tsx`
(except Dashboard + GymMode).

## Design system ("precision instrument" — shipped 2026-07-19)

Tokens live in `tailwind.config.js`; component classes in `src/index.css`.

- **Volt `#CDFB45` is the ONLY accent** — primary action, PRs, active nav pill. Dark ink
  (`text-ink` = `#0A0C05`) on volt fills (never `text-white` on volt).
- **Ice `#5FA8FF` (`text-ice`) means "reference / last-time data" ONLY** — never decorative.
- Graphite surface stack: `base #0B0D11` < `surface #171B21` < `surface-2` < `surface-3`;
  hairline borders are white-alpha (`border-line`). The body has a faint volt aurora at the top.
- **Cards are "physical"**: `.card` = gradient light-from-above + inset top highlight + soft
  ambient shadow; `.card-hero` (bigger radius, volt-tinged radial) is the one big moment per
  screen; `.inset-panel` for quiet panels inside cards; `.row-list` for un-boxed divider lists.
- **Typography carries hierarchy**: display scale `text-display-xl/display/title/heading/stat`
  (Archivo, tight tracking, ~750 weight). **Every numeral uses `.tnum`** (Geist Mono).
  Eyebrow labels: `.label-tiny` (10.5px, semibold, 0.14em tracking).
- **Motion is choreography, not decoration**: `.stagger` (children rise in sequence),
  `CountUp` (ui component — animated stat numerals), `animate-rise/pop-in/ping-once`,
  `.shimmer-once` + `shadow-accent-glow` reserved for PR/celebration moments,
  spring easings (`ease-spring`). All gated by prefers-reduced-motion.
- **Layout**: screen gutter is `--gutter` (1.25rem) — use `px-[var(--gutter)]` for frames and
  `.bleed` for full-bleed rows. Sections breathe: `gap-6`+ between sections, `p-6` hero/stat cards.
- **Nav**: floating frosted pill (`BottomNav`) — active tab expands into a volt capsule.
- **One volt primary action per screen.** 48px min touch targets, 56px primary buttons (`size="xl"`),
  mono numbers dominate the active-set screen.

## Data & state

- `AppData` (persisted root) = user, templates, sessions (history), activeSession, PRs,
  photos, measurements, weeklyPlan, streakDates, restTimer.
- **Fresh installs start EMPTY** (`loadOrCreate` → `createEmptyData`, onboarded:false →
  onboarding). Demo data is **opt-in only**: the "Explore with demo data" link on onboarding
  (store `loadDemo`), which tests and `scripts/shot.mjs` also use. `resetAll` erases to empty
  (back to onboarding); `clearHistory` wipes logged history but keeps user/templates/plan.
  `user.currentPhase === 'Lean bulk'` is the demo fingerprint — Home shows a "clear demo data"
  banner for accounts still carrying it. Never re-introduce seeding-by-default.
- **Active session + rest timer survive refresh** (persisted). Undo is available after logging.
- Store persists the whole `AppData` slice to `localStorage` after every mutation, through the
  `Repository` abstraction — so a networked `Repository` can replace it with zero UI changes.
- **Optional cloud sync** (`store/cloudSync.ts` + `syncDiff`/`syncQueue`/`syncEngine`/
  `syncMigration`/`syncPull`, **Firebase**): when signed in (Firebase email/password — no
  email-confirmation step — set up in Account → Sign in), every entity (templates/sessions/
  measurements/meta/active-session) mirrors to its **own** Firestore doc under
  `users/{uid}/templates|sessions|measurements|meta|active/{id}` — NOT one whole-blob doc.
  `persist()` diffs the new `AppData` against the last-diffed snapshot (`lib/syncDiff.ts`,
  pure), enqueues entity-level mutations into an IndexedDB queue (`syncQueue.ts`, profile-
  scoped, survives refresh), and debounce-drains them (`syncEngine.ts`'s `drainQueue`) with
  **optimistic concurrency**: a per-entity `rev` baseline detects a concurrent edit from
  another device; the loser is shelved to `users/{uid}/conflicts/{id}` (visible in Settings —
  `components/account/ConflictShelf.tsx` — never silently discarded) instead of losing data
  the way whole-blob last-write-wins used to. A concurrent delete never forces through a
  concurrent edit. On sign-in: `syncMigration.ts` fans an existing legacy blob
  (`bodyos_app_state/{uid}`, kept in place as a rollback window) out into the normalized
  collections once (idempotent), then `syncEngine.ts`'s `pullRemote` + `catchUpNeverSynced`
  bring down anything new and push up anything never synced. localStorage remains the
  synchronous source of truth; sync is a background layer, so the sync `Repository` interface
  is untouched. `photos` + `restTimer` stay device-local (privacy + ephemeral); PRs/streaks are
  never synced either — they're derivations recomputed from `sessions` on every device
  (`lib/recompute.ts`). The Firebase web config is committed (public by design; **Firestore
  security rules** — `firestore.rules`, VCS-authoritative — enforce owner-only access). Paste
  the config into `src/lib/firebase.ts` to enable; empty config ⇒ sync section hides
  (`status: 'unconfigured'`), app stays fully offline.
  - **Firestore rules**: the authoritative copy is `firestore.rules` in this repo — deploy with
    `npx firebase-tools deploy --only firestore:rules`; the Firebase console is never the
    source of truth. Covers the normalized collections (owner-only, shape-validated), the
    legacy blob (kept for migration/rollback), write-once tombstones, and the conflict shelf.
  - **Firebase emulator tests** (`npm run test:emulator`, CI runs it): rules, push/pull
    reconciliation, migration, and the conflict shelf are all exercised against a REAL
    emulated Firestore + the actual `firestore.rules` file (not mocks) — see
    `docs/superpowers/specs/2026-07-20-normalized-sync-design.md` for the full design.
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
6. **A sync entity's rev baseline must only advance on a confirmed Firestore round-trip**
   (push success or pull adopt), never on the local act of enqueueing an edit. Bumping it at
   enqueue time made every entity's first-ever push look like a conflict (remote rev 0 vs. an
   already-advanced local baseline) — caught by the emulator suite before it shipped.
7. Firebase emulator tests that share one Firestore emulator/project **must run with
   `fileParallelism: false`** — running test files in parallel let one file's
   `testEnv.clearFirestore()` wipe another file's in-flight data mid-test.

## Environment notes

- **Cloud (Claude Code on the web) sessions:** `gh` is unavailable — use the GitHub MCP tools for
  PRs/merges; plain `git push` works. Set `git config user.email noreply@anthropic.com` +
  `user.name Claude` before committing (a stop-hook checks committer email). The Higgsfield CDN
  is policy-blocked and the *live* Firebase project is unreachable, but **the Firebase emulator
  suite works fine** (jar/UI download over npm/googleapis succeeds; `npm run test:emulator` runs
  real Firestore + Auth locally) — don't assume "network blocked" applies to it. Verify UI with
  local Playwright: build, serve `dist/` at `/bodyos/` with a tiny node http server, launch
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

**205 unit tests** (`npm run test`): pure libs (progression, volume, plates, format, plan,
prstats/liveSetPr, analytics, volumeLandmarks, repMax, syncDiff, syncPull, metrics, equipment),
store flows (gymFlow: supersets, deloads, warm-ups, RIR, routines, addExerciseToSession;
repository incl. parseBackup; syncQueue), and Testing-Library component/integration suites
(ActiveSetCard, SetGrid, Profile, GymMode on its real route, Sheet a11y). Match these styles
when adding tests.

**34 Firebase emulator tests** (`npm run test:emulator` — needs Java; downloads the Firestore
emulator jar on first run): rules (owner-only, shape validation, cross-user denial, tombstone
write-once), the sync engine (push/pull/migration against a REAL emulated Firestore + the actual
`firestore.rules` file, not mocks), and integration tests exercising the real `cloudSync.ts`
module wiring end-to-end (sign-in → migrate → pull → catch-up → drain, account deletion,
conflict shelf). Files are named `*.emulator.test.ts` and excluded from the default `npm run
test` run (a dedicated `vitest.emulator.config.ts` — vitest's `exclude` always wins over a CLI
include filter, so a separate config is required). All emulator test files run sequentially
(`fileParallelism: false`) since they share one Firestore emulator/project and some call
`clearFirestore()`.

## How to verify a change (before claiming done)

`npm run lint && npm run typecheck && npm run test && npm run build`, then drive the real flow
in a browser. If the change touches sync (`cloudSync.ts`/`syncDiff`/`syncQueue`/`syncEngine`/
`syncMigration`/`syncPull`), also run `npm run test:emulator` — this is the one area where a
plausible-looking change can be subtly wrong (it caught 3 real bugs during the normalized-sync
build: a premature rev-baseline bump, a cross-file emulator test race, and an incomplete
account deletion). In cloud sessions use the Playwright pattern from "Environment notes" (serve
`dist/`, screenshot at 390×844 — this caught real bugs like the clipped Gym stepper). On the
user's machine, `npm run dev` + the in-app browser (screenshots may time out; prefer DOM checks).
