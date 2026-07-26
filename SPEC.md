# Workout Program Builder — Rebuild Specification

Date: 2026-07-26
Status: Approved design, pending implementation in a fresh repo.

## 1. Overview

A single-page web app for designing a **one-week, repeating workout program** that maximizes muscle growth. The app gives instant, research-grounded feedback while the user builds their week:

1. **Volume targets** — optimal weekly sets per muscle, driven by training focus, experience, and goal (balanced vs. focused).
2. **Coverage** — every muscle is accounted for; untouched muscles are surfaced, not hidden.
3. **Recovery** — same-muscle consecutive-day conflicts are flagged with concrete spacing suggestions.
4. **Sharing** — one-click view or edit links backed by a database.

Primary use is **desktop, seeing the whole week at once**. Mobile is a first-class *viewing* experience, one day at a time.

### Non-goals (deliberately removed from the previous app)

- Program setup wizard
- AI program generation (and all OpenAI/caching/prompt code)
- Multi-week programs / week tabs (the program is one repeating week)
- Import/Export JSON
- Per-exercise set type, rest time, and notes fields (superseded by superset grouping)
- Accounts/auth, program history, analytics charts beyond the volume panel

## 2. Tech stack

Same stack as the original, plus Vitest:

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix) — design tokens in `assets/design/` reproduce the current look, including dark mode
- dnd-kit for drag-and-drop
- Prisma + PostgreSQL (Vercel deploy, `DATABASE_URL` env)
- Vitest for unit tests (pure functions only — no e2e, no component tests)

## 3. Architecture

**Pure domain core + thin UI.** All core logic lives in `lib/engine/` as pure functions with zero React, Next.js, or Prisma imports. UI components and API routes are thin consumers. Only `lib/engine/` is unit-tested.

```
app/                  # routes: / (editor), /s/[shareId] (shared), api/programs/*
components/           # thin UI; no business logic
lib/engine/           # PURE: types, taxonomy, targets, volume, coverage, recovery, superset
lib/engine/__tests__/ # vitest suites
data/exercises.json   # exercise library (from assets/)
prisma/schema.prisma
```

## 4. Domain model

```ts
export type Focus = 'Hypertrophy' | 'Strength'
export type Experience = 'beginner' | 'intermediate' | 'advanced'

/** Balanced, or focused on 1–2 targets. A target is a muscle or a muscle group. */
export type Goal =
  | { mode: 'balanced' }
  | { mode: 'focused'; targets: FocusTarget[] }        // length 1–2, enforced by UI + engine
export type FocusTarget =
  | { kind: 'muscle'; muscle: Muscle }
  | { kind: 'group'; group: MuscleGroup }

export interface Exercise {
  id: string
  name: string
  equipment: string
  primaryMuscles: string[]     // library names; normalized via taxonomy aliases
  secondaryMuscles: string[]
  type: 'compound' | 'isolation'
}

export interface DayExercise {
  exerciseId: string
  name: string                 // denormalized for display
  sets: number                 // 1–10
  reps: string                 // free text, e.g. "8-12"
  supersetId?: string          // entries sharing an id within a day form a superset
}

export interface Day {
  type: 'work' | 'rest'
  exercises: DayExercise[]     // empty when rest
}

export interface Program {
  name: string
  description: string
  focus: Focus
  experience: Experience
  goal: Goal
  days: [Day, Day, Day, Day, Day, Day, Day]   // always 7, Monday-indexed (0 = Mon)
  customExercises: Exercise[]
}
```

The persisted record wraps `Program` as JSON (§9). There is no `weeks` array and no thresholds stored on the program — targets are always derived from `focus + experience + goal`.

## 5. Muscle taxonomy

### 5.1 Tracked muscles (canonical)

These 22 muscles have volume targets and appear in the analytics panel, grouped by region:

| Group | Muscles |
|---|---|
| Chest | Chest, Upper Chest, Lower Chest |
| Back | Lats, Rhomboids, Mid Traps, Lower Back, Traps |
| Shoulders | Shoulders, Front Delts, Side Delts, Rear Delts |
| Arms | Biceps, Triceps, Forearms |
| Legs | Quads, Hamstrings, Glutes, Calves, Adductors |
| Core | Core, Obliques |

`MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'` — these six groups are also what the focused-goal picker offers alongside individual muscles.

### 5.2 Aliases

The exercise library uses a few names outside the canonical set. Normalize at volume-calculation time:

| Library name | Counts toward |
|---|---|
| Brachialis | Biceps |
| Hip Flexors | Core |
| Upper Back | Rhomboids |
| Full Body | *ignored* (no per-muscle attribution) |

Unknown muscle names (e.g. from custom exercises with free-text entry — the UI should prevent this by offering only canonical names) are ignored by the engine, never crash it.

## 6. Volume engine

### 6.1 Research basis

- Hypertrophy rises with weekly volume with diminishing returns; frequency has little effect on hypertrophy when volume is equated, but same-muscle sessions still warrant ~48 h spacing for recovery ([Pelland et al., meta-regression of 67 studies](https://pubmed.ncbi.nlm.nih.gov/41343037/)).
- Practical volume landmarks for trained lifters: maintenance ≈ 6 sets/week for large muscles, most growth in the 10–20 sets/week range, with individual variation ([RP volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)).
- Strength requires less direct volume than hypertrophy; returns diminish faster (Pelland et al.).

The numbers below were re-validated against this external research in July 2026; the previous repo's internal research docs were disregarded.

### 6.2 Base table

`BASE_IDEAL[focus][experience][muscle]` — the "ideal" weekly sets for balanced mode. Values for the original 19 muscles are carried over from the previous app (they align with the landmarks above); the three new muscles get small accessory targets.

Hypertrophy (beginner / intermediate / advanced):

| Muscle | B | I | A |
|---|---|---|---|
| Chest | 12 | 16 | 20 |
| Upper Chest | 4 | 6 | 8 |
| Lower Chest | 4 | 6 | 8 |
| Lats | 8 | 12 | 16 |
| Rhomboids | 6 | 8 | 12 |
| Mid Traps | 4 | 6 | 10 |
| Lower Back | 4 | 6 | 8 |
| Traps | 6 | 8 | 12 |
| Shoulders | 12 | 16 | 20 |
| Front Delts | 4 | 6 | 8 |
| Side Delts | 6 | 8 | 12 |
| Rear Delts | 6 | 8 | 10 |
| Biceps | 8 | 12 | 16 |
| Triceps | 8 | 12 | 16 |
| Forearms | 2 | 4 | 6 |
| Quads | 12 | 16 | 20 |
| Hamstrings | 8 | 12 | 16 |
| Glutes | 8 | 12 | 16 |
| Calves | 8 | 12 | 16 |
| Adductors | 2 | 4 | 6 |
| Core | 6 | 10 | 14 |
| Obliques | 2 | 4 | 6 |

Strength: 75% of the Hypertrophy value, rounded (`round(0.75 · h)`), reflecting the faster diminishing returns for strength. (This reproduces the previous app's Strength table within ±1 set.)

### 6.3 Targets

`getTargets(focus, experience, goal): Record<Muscle, { min, ideal, max }>`

Let `ideal = BASE_IDEAL[focus][experience][muscle]`.

- **Balanced**: `min = ceil(0.75 · ideal)`, `max = floor(1.25 · ideal)`.
- **Focused — targeted muscles** (a group target expands to its member muscles):
  `idealF = min(round(1.5 · ideal), floor(1.25 · BASE_IDEAL[focus]['advanced'][muscle]))` (MRV cap),
  `min = ideal` (the old balanced ideal becomes the floor), `max = floor(1.25 · idealF)`.
- **Focused — all other muscles** (maintenance):
  `idealM = max(round(0.4 · ideal), 2)`, `min = max(round(0.25 · ideal), 1)`, `max = ideal`
  (anything up to the old balanced ideal is acceptable; beyond it spends recovery budget the focus muscles need).

`goal.targets` longer than 2 is a validation error (engine throws; UI prevents).

### 6.4 Weekly volume

`getWeeklyVolume(program, exercises): Record<Muscle, { sets: number; days: number[] }>`

- Per exercise entry: each **primary** muscle gets `sets × 1.0`, each **secondary** muscle gets `sets × 0.5`.
- Names normalized through the alias map; unknown ids/names skipped.
- Sets rounded to nearest 0.5 at the end.
- `days` = sorted day indices (0–6) on which the muscle received any volume.
- Supersets have no effect on volume — grouping is presentational/pacing only.

### 6.5 Coverage

`getCoverage(volume, targets): CoverageRow[]` — one row per tracked muscle, always all 22:

```ts
interface CoverageRow {
  muscle: Muscle
  group: MuscleGroup
  sets: number
  target: { min: number; ideal: number; max: number }
  status: 'none' | 'low' | 'ideal' | 'high'
  focused: boolean            // true when this muscle is a focus target
}
```

`status`: `none` if sets = 0; `low` if `0 < sets < min`; `high` if `sets > max`; else `ideal`.

## 7. Recovery engine

`getRecoveryWarnings(program, exercises): RecoveryWarning[]`

```ts
interface RecoveryWarning {
  id: string                        // stable, for dismissal/rendering
  muscle: Muscle
  dayA: number; dayB: number        // consecutive day indices, dayB = dayA + 1
  severity: 'critical' | 'warning'  // critical: primary on BOTH days; warning otherwise
  suggestion: number | null         // day index that resolves the conflict, or null
}
```

Rules:

- A conflict exists when the same muscle receives volume on two **consecutive calendar days** (rest days break adjacency; day 6 → day 0 wrap is NOT considered adjacent — the week is planned Mon–Sun).
- `critical` when the muscle is a *primary* mover on both days; `warning` when either side is secondary-only.
- **Spacing suggestion**: consider moving `dayB`'s offending exercises. A candidate day `d` resolves the conflict if placing that muscle's volume on `d` leaves ≥ 2 calendar days between every pair of sessions for that muscle. Prefer existing work days; fall back to rest days (UI phrases this as "e.g. move to Thursday"); `null` if no day resolves it.
- Warnings are advisory — nothing is blocked.

## 8. Supersets

- A superset is 2+ `DayExercise` entries in the same day sharing a `supersetId`.
- Created in the UI by selecting adjacent exercises → "Group as superset"; ungroup clears the id.
- Superset members are contiguous in the day's list and drag as a single unit; dragging a member out ungroups it. A group left with one member is dissolved.
- Invariant helpers in the engine: `normalizeSupersets(day)` enforces contiguity/min-size after any mutation (pure, tested).

## 9. Persistence & sharing

### 9.1 Prisma schema

```prisma
model Program {
  id        String   @id @default(cuid())
  editId    String   @unique          // URL-safe nanoid(10) — full access
  viewId    String   @unique          // URL-safe nanoid(10) — read-only
  data      Json                      // the Program object (§4)
  parentId  String?                   // set when copied from a shared program
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

One row per program with two capability URLs: knowing `editId` grants edit, knowing `viewId` grants read-only. Both ids are minted at creation; no sync between records is ever needed.

### 9.2 Behavior

- **Auto-save**: debounced ~1 s after any change, `PUT` full program JSON. Save state indicator in header (saved / saving / error-retry).
- **First save** creates the record; the edit shareId is stored in `localStorage` so returning users land back on their program. No accounts.
- **Share button**: copies either the view link (`/s/{viewShareId}`) or edit link (`/s/{editShareId}`).
- **View link**: read-only planner + analytics; no editing affordances; "Copy this program" clones into a fresh EDIT record (`parentId` set) and hands the copier their own edit link.
- **Edit link**: full access for anyone holding it.

### 9.3 API routes (thin — no domain logic)

- `POST /api/programs` — body `{ data }` or `{ copyOf: anyShareId }` → `{ editId, viewId }`
- `GET /api/programs/[shareId]` — resolves either id → `{ data, access: 'edit' | 'view' }`; when access is `view`, `editId` is never returned
- `PUT /api/programs/[shareId]` — body `{ data }`; **403 unless shareId is an editId**

## 10. UI specification

Keep the current visual design: same Tailwind/shadcn tokens (`assets/design/`), light/dark mode with theme toggle, information-dense, no flow-interrupting modals.

### 10.1 Desktop (primary)

- **Header**: inline-editable program name + description · save indicator · Share (popover: copy view link / copy edit link) · theme toggle.
- **Setup bar** (compact, single row): Focus toggle (Hypertrophy/Strength) · Experience select · Goal: "Balanced" or "Focused" — focused opens a picker of the 6 groups + 22 muscles, max 2 selections shown as removable chips. Any change recomputes targets instantly.
- **Planner (~2/3 width)**: all 7 days as columns (Mon–Sun), horizontal scroll below ~1280 px. Each day: name, work/rest toggle; work days list exercise cards (name, `sets × reps` steppers/inputs) with:
  - drag-and-drop within and between days (dnd-kit; grip handle)
  - inline search-to-add at the bottom of each day (filtered library list; "+ Create custom exercise" opens a slide-out panel: name, equipment, primary/secondary muscles from canonical list, compound/isolation)
  - superset grouping: multi-select adjacent cards → "Group"; rendered as a bracketed block with shared accent border, drags as one unit
- **Analytics (~1/3 width, sticky)**:
  - Recovery warnings at top (critical = red, warning = amber), each with its spacing hint.
  - Coverage table grouped by the 6 regions: muscle · sets vs target (e.g. `14 / 12–20`) · status pill (`none` = gray "untrained", `low` = amber, `ideal` = green, `high` = red) · a ★/flame marker on focused muscles. Group header rows show summed sets.

### 10.2 Mobile (viewing on the go)

- Single-column, **one day at a time**: swipeable day pager with Mon–Sun tab strip; opens on the current weekday.
- Analytics collapses into a bottom sheet (peek header shows warning count + overall coverage summary).
- Editing remains possible (same components) but is optimized for viewing; drag-and-drop degrades to a long-press reorder within the visible day.

### 10.3 Read-only mode (`/s/{viewShareId}`)

Same layouts minus all editing affordances; header shows program name + "Copy this program".

## 11. Testing

Vitest, `lib/engine/` only. Suites:

- **targets.test.ts** — balanced min/ideal/max per focus × experience (spot-check table values); focused boost + MRV cap; group target expands to members; non-focused maintenance floors; 2-target max enforced; Strength = 75% derivation.
- **volume.test.ts** — primary 1.0 / secondary 0.5; alias normalization (Brachialis→Biceps etc.); `Full Body` and unknown names ignored; 0.5 rounding; days-worked collection; supersets don't alter volume.
- **coverage.test.ts** — all 22 muscles always present; `none/low/ideal/high` boundary conditions (sets = min, = max, = 0); focused flag.
- **recovery.test.ts** — consecutive-day detection; rest day breaks adjacency; no Sun→Mon wrap; critical vs warning severity; suggestion resolves to a valid day, prefers work days, `null` when impossible.
- **superset.test.ts** — `normalizeSupersets`: contiguity enforcement, single-member dissolution.

No e2e, component, or API tests.

## 12. Handoff package

```
handoff/
├── SPEC.md            # this document
├── PLAN.md            # implementation plan (fresh-session executable)
├── README.md          # how to seed the new repo
└── assets/
    ├── exercises.json # 193-exercise library
    ├── design/        # globals.css, tailwind.config.js, components.json, postcss.config.mjs
    └── public/        # favicons, app icons, webmanifest
```
