# BodyOS — Roadmap

Status legend: ✅ done · 🟡 partial · ⬜ todo · 🔒 blocked

Last updated: 2026-07-17. Design spec: `docs/superpowers/specs/2026-07-16-ui-redesign-roadmap-design.md`.

---

## ✅ Phase 0 — MVP (shipped)

- ✅ App scaffold: React + TS (strict) + Vite + Tailwind + Zustand + Router + Recharts + Vitest
- ✅ Domain model (templates ≠ sessions), exercise library, seeded demo data
- ✅ Progressive-overload engine (double progression, reduce/deload on stalls, reasons) + tests
- ✅ Store + `Repository` persistence abstraction over localStorage; active-session & rest-timer recovery
- ✅ Gym Mode: one-tap Log Set, smart prefill, auto weight copy-forward, auto rest timer, undo,
  difficulty rating, exercise history
- ✅ Dashboard, Workouts (+ planning/editor), Exercises, Progress, Photos, Profile, Settings, Onboarding
- ✅ Workout completion summary with progression recommendations + PR detection
- ✅ Progress photos (private, local, pose guide, before/after slider)
- ✅ 27 tests (progression, volume/1RM, unit conversion, full store flow)
- ✅ Deployed to GitHub Pages via GitHub Actions (base `/bodyos/`, SPA 404 fallback)

## ✅ Phase 1 — UI overhaul (shipped)

Ported the user's mockup design system so it reads as a real product, not an AI template.

- ✅ Design tokens → Tailwind: volt `#CDFB45` sole accent, near-black surfaces, ice `#5FA8FF`
  for reference data, hairline borders
- ✅ Self-hosted fonts: Archivo (UI) + Geist Mono (all numerals via `.tnum`)
- ✅ Eyebrow labels, volt primary buttons (dark ink), one primary action per screen
- ✅ 5-tab nav (Home · Workouts · Exercises · Stats · Progress); Profile → header avatar
- ✅ New **Stats** screen (strength trends + all PRs); `/progress/strength` redirects to it
- ✅ Dashboard rebuilt to mockup anatomy: hero, KPI grid, weekly-volume bars, 1RM sparkline,
  muscle-balance bars, PR list, recent sessions
- ✅ Contrast fixes (no white-on-volt); ice-blue "last time" values in Gym Mode

## ✅ Phase 2 — Real-app feel

- ✅ Code-splitting: lazy routes → initial bundle **662 kB → ~250 kB**; Recharts isolated in a
  lazy chunk
- ✅ PWA manifest + volt app icon → installable, standalone display, theme color
- ✅ **Offline service worker** (`vite-plugin-pwa` / Workbox, `generateSW` + `autoUpdate`) —
  precaches the app shell, all hashed chunks, fonts, and exercise photos (49 entries, ~1 MB);
  `navigateFallback` → `/bodyos/index.html` so SPA deep links resolve offline. SW disabled in
  dev (`devOptions.enabled: false`); the hand-authored `public/manifest.webmanifest` is kept
  (`manifest: false`).

## ✅ Exercises & visuals

- ✅ Library expanded to **66 exercises** across all muscle groups (instructions, coaching cues,
  equipment, patterns, substitutions)
- ✅ **Crafted glyph tiles** (`ExerciseGlyph` + `ExerciseThumb`): muscle-tinted gradient tiles with
  per-equipment line glyphs, consistent across the whole library — replaced the blobby AI photos.
- ✅ **Muscle map** (`MuscleMap`): front/back body highlighting muscles by intensity. On the
  exercise detail it shows what a movement trains (primary bright, secondary faint); on the
  Dashboard the same component is a **weekly training heatmap** (shaded by sets per muscle) so you
  can see what you're neglecting when planning. Pure SVG.
- ✅ Library search + muscle/equipment filters + live result count; detail screen has 1RM chart,
  last-performed, how-to, **form cues**, and substitutions.
- ⬜ **Optional curated photos** — can be layered back in via `ExerciseThumb`'s `PHOTO_IDS` set;
  regenerate a better set locally per `docs/exercise-photos.md` (cloud sandbox blocks the CDN).

## 🟡 Phase 3 — Polish

- ✅ Screen transitions (subtle per-route `page-in` enter) + tap-scale press feedback on cards
- ✅ Refined empty states (inviting accent-tinted icon, fade-in) + onboarding steps animate in
- ✅ Training-consistency calendar on Progress (`ConsistencyGrid`): contribution-style grid of
  workout days over the last 16 weeks, cells shaded by set count
- ✅ **Rest-timer completion alert** — a two-tone Web Audio chime (`lib/sound.ts`, no assets) plays
  when the rest timer finishes, alongside the vibration. Both are opt-out: the buzz honours the
  existing "Haptic feedback" toggle, the chime a new "Rest timer sound" toggle (Settings). Audio is
  primed from the "Log Set" tap (`unlockAudio`) so mobile browsers allow it.
- ✅ **Data export / import** — Settings → Data → "Export data" downloads the full `AppData` as a
  timestamped JSON backup (`bodyos-backup-YYYY-MM-DD.json`); "Import data" restores from one via a
  file picker. Import is validated + normalized by a pure, tested `parseBackup` (rejects non-BodyOS
  JSON so a stray file can't wipe your log) and gated behind a confirm sheet that shows the backup's
  template/session counts before it overwrites. `exportData` store action + `replaceAll` for apply.
- 🟡 Haptics coverage (Gym Mode logs honour the toggle); safe-area audit on a real device still todo
- 🟡 Store-level flow tests exist (`gymFlow.test.ts`); component/E2E for Gym Mode still todo

## 🟡 Phase 4 — Accounts & cloud sync (Supabase)

Unblocked and shipped (v1): optional email/password accounts + whole-blob cloud sync.

- ✅ **Auth** — Supabase email/password, fully optional (the app stays offline-first; no forced
  login). "Account & Sync" section in Settings (`src/store/cloudSync.ts`, `src/lib/supabase.ts`).
- ✅ **Cloud sync** — the whole `AppData` is mirrored to `public.bodyos_app_state` (one `jsonb`
  row per user, owner-only RLS). Pushed on save (debounced 1.5 s), pulled + reconciled on
  sign-in. Conflicts: whole-blob **last-write-wins** by server `updated_at`. localStorage stays
  the synchronous source of truth; cloud is a background layer — so the synchronous `Repository`
  interface is untouched. Reconciliation core is unit-tested (`cloudSync.test.ts`); the Supabase
  client is lazy-loaded to keep it out of the initial bundle.
- ✅ **Cost-free isolation** — lives in the existing shared Supabase project (Pro org, no new
  ~$10/mo project) in its own `bodyos_app_state` table; never touches the co-hosted app's tables.
- ⬜ **Progress-photo sync** — photos are device-local by design (privacy + `jsonb` size), so they
  are excluded from the synced blob. Needs a private Storage bucket + upload flow to sync.
- ⬜ **OAuth (Google)** sign-in — needs provider + redirect-URL config in the Supabase dashboard.
- ⬜ **Relational schema** (per-table sessions/PRs) — only if server-side queries/analytics are
  ever needed; the blob model already covers multi-device sync.

## 🟡 Phase 5 — Deeper training features

- ✅ **Plate calculator** — per-side barbell breakdown shown live under the weight in Gym Mode
  (barbell lifts only), unit-aware (kg/lb bar + plate sets), reports any unloadable remainder.
  Pure logic in `lib/plates.ts` (`computePlates`), 7 tests.
- ✅ **Warm-up set generator** — one tap inserts a ramping warm-up (empty bar → ~50/70/85 %) before
  the working sets on a barbell exercise (`generateWarmups` + `addWarmupSets` store action), 4 tests.
- ✅ **Swap exercise mid-workout** — in Gym Mode, tap the swap icon on an unstarted exercise to
  replace it with a substitution (or a same-muscle alternative); sets are re-prefilled from the new
  exercise's history via `prefillFor` (`swapExercise` action). Hidden once a set is logged.
- ✅ **Per-exercise notes** — a durable note-to-self on each exercise, editable on the detail
  screen and shown on the active-set card in Gym Mode (`exerciseNotes` in AppData, syncs).
- ✅ **Supersets** — mark consecutive exercises as a superset in the editor ("Superset with
  above"); Gym Mode then alternates set-by-set between them, resting only after each round.
  Opt-in — ungrouped exercises behave exactly as before. (`supersetGroup` on the template +
  session; the alternating logic lives in `logActiveSet`.)
- ✅ **Optional RPE/RIR entry** — when "Show RIR / RPE" is on (Settings), each working set gets a
  0–4+ reps-in-reserve picker in Gym Mode (with RPE equivalent); RIR is shown in the set ledger and
  **feeds progression** by mapping to per-set difficulty (`rirToDifficulty`, in the tested engine).
- ✅ **Body-measurement tracking UI** — `/progress/measurements`: log body weight + waist/chest/arm,
  latest-snapshot tiles with deltas, dated history with delete, unit-aware (kg/cm or lb/in). Seeded
  with a demo lean-bulk trend; `deleteMeasurement` action added.
- 🟡 Week planning / deload scheduling
  - ✅ **Starter routines** (`/workouts/routines`): pick a split (Full Body 3×, Upper/Lower 4×,
    PPL 6×) and it builds the workout templates and drops them onto the weekly plan in one tap.
    Also offered during onboarding (days-matched split pre-selected as "Recommended").
  - ✅ **Week planning** — the Workouts weekly strip is now editable: tap any day to assign a
    template or set a rest day (wires up the existing `setPlanForDay` + `weeklyPlan`).
  - ✅ **Deload** — start any workout as a deload (Dashboard hero / workout detail): ~90% load,
    sets capped at 2, badged in Gym Mode + history. Deloads are excluded from progression
    baselines (prefill, stall counting, PRs) so they don't corrupt your numbers.
- ⬜ Landing/marketing page

---

## Suggested next session

1. Finish exercise photos (remaining ~40) — quick, high visual impact. (Higgsfield now
   reachable from here — ~936 credits available.)
2. Build `SupabaseRepository` (Phase 4) — the real product milestone. **Now unblocked:** the
   Supabase connector is authorized and an `ACTIVE_HEALTHY` project already exists (eu-west-3).

See `CLAUDE.md` for architecture, conventions, the design system, and gotchas.
