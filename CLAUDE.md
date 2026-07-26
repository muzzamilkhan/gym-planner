# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A ground-up rebuild of a workout program builder, seeded from a handoff package produced from the original `workout-planner` repo. **`SPEC.md` is the approved specification and the source of truth** — read it before making product or engine decisions. `README.md` describes the handoff contents. The app: a single-page planner for a one-week repeating workout program with volume targets, muscle coverage, recovery warnings, and share links.

Deliberate non-goals (do not reintroduce): setup wizard, AI generation, multi-week programs, import/export JSON, per-exercise set-type/rest/notes, accounts/auth.

## Stack

Next.js (App Router) + React + TypeScript, Tailwind + shadcn/ui, dnd-kit, Prisma + PostgreSQL, Vitest.

## Commands

- Dev server is already running on port 3000 — do not start it; check `dev.log` to debug.
- `npx vitest run` — run all unit tests; `npx vitest run lib/engine/__tests__/volume.test.ts` for a single suite.
- `npx prisma migrate dev` / `npx prisma generate` — schema changes (needs `DATABASE_URL`).

## Workflow

This is a hobby project — optimize for momentum, not ceremony.

- **Work directly on `main`** unless the user explicitly asks for a branch. Don't create feature branches or PRs by default.
- **Always commit and push** when work is complete. Don't wait to be asked, and don't leave changes sitting uncommitted.

## Architecture: pure domain core + thin UI

All business logic lives in `lib/engine/` as **pure functions with zero React/Next/Prisma imports**: types, muscle taxonomy (22 canonical muscles + alias map), volume targets, weekly volume, coverage, recovery warnings, superset normalization. UI components (`components/`) and API routes (`app/api/programs/*`) are thin consumers — no domain logic outside the engine.

Only `lib/engine/` is unit-tested (Vitest). No e2e, component, or API tests — by design.

Key engine rules worth knowing before touching anything (full detail in SPEC.md §5–8):
- Volume: primary muscle = sets × 1.0, secondary = × 0.5; library names normalized via aliases (Brachialis→Biceps, Hip Flexors→Core, Upper Back→Rhomboids, Full Body ignored); unknown names are silently ignored, never crash.
- Targets always derive from `focus + experience + goal` — never stored on the program.
- Recovery: same-muscle volume on consecutive days (rest breaks adjacency, no Sun→Mon wrap); critical if primary on both days.
- Supersets are presentational only — never affect volume.

## Persistence & sharing

One `Program` row per program with two capability URLs: `editId` (full access) and `viewId` (read-only). `PUT` must 403 unless the shareId is an editId; `GET` via viewId must never leak `editId`. Program data is a single JSON column; edit shareId kept in `localStorage` (no accounts).

## Seed assets

- `assets/exercises.json` → copy to `data/exercises.json` (193-exercise library).
- `assets/design/` (globals.css, tailwind.config.js, components.json, postcss.config.mjs) reproduces the original visual design incl. dark mode — use these rather than authoring new tokens.
- `assets/public/` → copy to `public/` (icons, webmanifest).
