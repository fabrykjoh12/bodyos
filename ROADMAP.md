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

## 🟡 Exercises & photos

- ✅ Library expanded to **~55 exercises** across all muscle groups (instructions, equipment,
  patterns, substitutions)
- ✅ `ExerciseThumb` with muscle-tinted fallback; thumbnails in library + hero image on detail
- ✅ Higgsfield 3D-illustration photos for the **15 template exercises** (see CLAUDE.md pipeline)
- ⬜ **Generate photos for the remaining ~40 exercises** (~80 credits, ~5–10 min). Same style
  prompt + pipeline. Remaining ids:
  `db-bench-press, machine-chest-press, db-shoulder-press, pull-up, goblet-squat, leg-extension,
  overhead-extension, plank, hanging-leg-raise, dips, cable-fly, pec-deck, push-up, deadlift,
  chin-up, t-bar-row, face-pull, straight-arm-pulldown, arnold-press, rear-delt-fly, upright-row,
  front-raise, front-squat, hack-squat, bulgarian-split-squat, walking-lunge, hip-thrust,
  good-morning, seated-calf-raise, hammer-curl, preacher-curl, skullcrusher, close-grip-bench,
  reverse-curl, cable-crunch, russian-twist, ab-wheel`

## ⬜ Phase 3 — Polish

- ⬜ Screen transitions + list/press micro-interactions
- ⬜ Refined empty states + onboarding polish
- ⬜ Haptics coverage; safe-area audit on a real device
- ⬜ Component/E2E tests for Gym Mode (Testing Library is installed but unused)

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
- ⬜ Supersets / circuits
- ✅ **Optional RPE/RIR entry** — when "Show RIR / RPE" is on (Settings), each working set gets a
  0–4+ reps-in-reserve picker in Gym Mode (with RPE equivalent); RIR is shown in the set ledger and
  **feeds progression** by mapping to per-set difficulty (`rirToDifficulty`, in the tested engine).
- ✅ **Body-measurement tracking UI** — `/progress/measurements`: log body weight + waist/chest/arm,
  latest-snapshot tiles with deltas, dated history with delete, unit-aware (kg/cm or lb/in). Seeded
  with a demo lean-bulk trend; `deleteMeasurement` action added.
- 🟡 Week planning / deload scheduling
  - ✅ **Week planning** — the Workouts weekly strip is now editable: tap any day to assign a
    template or set a rest day (wires up the existing `setPlanForDay` + `weeklyPlan`).
  - ⬜ Deload scheduling — needs a deload-week data model.
- ⬜ Landing/marketing page

---

## Suggested next session

1. Finish exercise photos (remaining ~40) — quick, high visual impact. (Higgsfield now
   reachable from here — ~936 credits available.)
2. Build `SupabaseRepository` (Phase 4) — the real product milestone. **Now unblocked:** the
   Supabase connector is authorized and an `ACTIVE_HEALTHY` project already exists (eu-west-3).

See `CLAUDE.md` for architecture, conventions, the design system, and gotchas.
