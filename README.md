# Handoff package — Workout Program Builder rebuild

This directory seeds a new repo that rebuilds the workout planner keeping only its core
functionality. It was produced from the original `workout-planner` repo on 2026-07-26.

## Contents

- `SPEC.md` — approved product + technical specification. Read this first.
- `PLAN.md` — step-by-step implementation plan, written to be executed in a fresh
  Claude Code session (superpowers `executing-plans` skill compatible).
- `assets/exercises.json` — the 193-exercise library (copy to `data/exercises.json`).
- `assets/design/` — `globals.css`, `tailwind.config.js`, `components.json`,
  `postcss.config.mjs` from the original app; these reproduce the existing visual design.
- `assets/public/` — favicons, app icons, webmanifest (copy to `public/`).

## Seeding the new repo

1. `git init` the new repo (e.g. `workout-planner-v2`) adjacent to the original.
2. Copy this entire `handoff/` directory into it (root level is fine).
3. Start a Claude Code session and ask it to execute `handoff/PLAN.md`.

The plan scaffolds Next.js + TypeScript + Tailwind + shadcn + Prisma + Vitest and then
implements the pure engine (test-first), UI, and sharing per the spec.

## Core functionality kept

- Weekly volume targets per muscle (focus × experience × goal: balanced / focused ≤2)
- Full-muscle coverage accounting (untrained muscles surfaced)
- Recovery: consecutive-day conflict warnings + spacing suggestions
- Share via link (view-only and editable)
- Current visual design; desktop week-at-a-glance, mobile one-day-at-a-time

## Removed

Wizard, AI generation, multi-week programs, import/export, per-exercise set-type/rest/notes
(replaced by superset grouping), accounts.
