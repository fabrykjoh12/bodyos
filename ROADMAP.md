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

## 🟡 Phase 2 — Real-app feel

- ✅ Code-splitting: lazy routes → initial bundle **662 kB → ~250 kB**; Recharts isolated in a
  lazy chunk
- ✅ PWA manifest + volt app icon → installable, standalone display, theme color
- ⬜ **Offline service worker** (Workbox / vite-plugin-pwa) — precache the app shell + hashed
  chunks so it works fully offline in the gym. Do this *after* splitting (already done).

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

## 🔒 Phase 4 — Accounts & sync (Supabase)

Blocked: the Supabase MCP connector needs OAuth authorization in claude.ai connector settings
before it can be used from here.

- ⬜ Supabase project (free tier): auth (email/OAuth)
- ⬜ Postgres tables mirroring the TS domain model; RLS
- ⬜ Storage bucket for progress photos (private)
- ⬜ `SupabaseRepository implements Repository` — drop-in behind the existing interface;
  localStorage demotes to an offline cache with background sync

## ⬜ Phase 5 — Deeper training features

- ⬜ Plate calculator + warm-up set generator
- ⬜ Supersets / circuits
- ⬜ Optional RPE/RIR entry (types already support `rir`)
- ⬜ Body-measurement tracking UI
- ⬜ Week planning / deload scheduling
- ⬜ Landing/marketing page

---

## Suggested next session

1. Finish exercise photos (remaining ~40) — quick, high visual impact.
2. Offline service worker (Phase 2 finish) — makes it a true gym PWA.
3. Authorize Supabase, then build `SupabaseRepository` (Phase 4) — the real product milestone.

See `CLAUDE.md` for architecture, conventions, the design system, and gotchas.
