# BodyOS

**The operating system for your body.** A serious, mobile-first training tool built around one idea:

> Track every set in seconds, and always know exactly what to beat next.

BodyOS prioritizes the workout-tracking experience above everything else — dashboards, analytics, and photos support the core loop, they don't crowd it.

## What it does

- **Gym Mode** — a one-handed, dark, low-friction workout screen. Smart-prefilled weight & reps, one big **Log Set** tap, automatic weight copy-forward, an auto-starting rest timer, instant undo, and a live view of what you did last time.
- **Progressive overload engine** — transparent, rule-based **double progression**. Hit the top of your rep range on every set → add weight. Otherwise → add reps. Repeated stalls → reduce/deload. Every recommendation shows the reason.
- **Workout planning** — PPL / Upper-Lower / Full-Body templates, an exercise library, drag-free reordering, editable sets/reps/rest.
- **Progress** — strength charts (estimated 1RM over time), weekly volume, personal records, and plain-language summaries.
- **Progress photos** — a private, on-device photo timeline with a pose guide and before/after slider. Never uploaded.
- **Onboarding, profile, settings** — units (kg/lb), rest defaults, haptics, reduced motion, and a full data reset.

## Tech

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Zustand · React Router · Recharts · Lucide · Vitest.

State persists to `localStorage` through a `Repository` abstraction (`src/store/repository.ts`) so a real backend can be dropped in later without touching UI code. Active workouts (including the rest timer) survive a refresh.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run test     # run the unit test suite (Vitest)
npm run typecheck
```

## Project layout

```
src/
  types/         Domain model (templates vs. sessions kept separate)
  lib/           Pure logic: progression engine, analytics, 1RM/volume, dates, history
  data/          Exercise library + seeded demo data
  store/         Zustand store + localStorage repository
  components/    ui/ (design system) · layout/ · workout/ · progress/
  screens/       One file per route
  hooks/         Rest timer, interval
```

The highest-risk logic — the progression engine, set logging, weight copy-forward,
undo, persistence, and workout summaries — is covered by tests in
`src/lib/*.test.ts` and `src/store/repository.test.ts`.
