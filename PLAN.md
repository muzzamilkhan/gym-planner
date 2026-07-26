# Workout Program Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the workout planner per `SPEC.md`: a single-page weekly program builder with volume targets, coverage, recovery warnings, supersets, and capability-URL sharing.

**Architecture:** Pure domain core in `lib/engine/` (zero React/Next/Prisma imports, fully unit-tested with Vitest) consumed by thin UI components and thin API routes. One Prisma `Program` row per program with `editId`/`viewId` capability ids; program data is one JSON column.

**Tech Stack:** Next.js (App Router) + React + TypeScript, Tailwind v3 + shadcn/ui (new-york), dnd-kit, Prisma + PostgreSQL, Vitest, nanoid.

## Global Constraints

- `lib/engine/` files import nothing from React, Next.js, or Prisma. Engine functions never throw on unknown muscle/exercise names — they ignore them. The single documented exception: `getTargets` throws on >2 focus targets.
- Only `lib/engine/` gets tests. No e2e, component, or API tests.
- Days array is always length 7, Monday-indexed (0 = Mon). Day 6→0 wrap is never adjacent.
- Supersets never affect volume.
- `GET` via viewId must never return `editId`; `PUT` returns 403 unless the shareId is an editId.
- Exercise library `type` field has 5 values in the data (`compound | isolation | isometric | olympic | plyometric`) — the engine type must accept all 5; only the custom-exercise UI restricts to compound/isolation.
- Non-goals (never add): wizard, AI generation, multi-week, import/export, per-exercise rest/notes/set-type, accounts.
- Dev server already runs on port 3000 (`dev.log` for debugging) — never `npm run dev`.
- Path alias `@/*` → repo root. Design tokens come from `assets/design/` — do not author new tokens.

---

### Task 1: Scaffold repo

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`, `app/globals.css` (copied), `tailwind.config.js` (copied), `postcss.config.mjs` (copied), `components.json` (copied), `public/*` (copied), `data/exercises.json` (copied), `lib/utils.ts`
- Modify: none

**Interfaces:**
- Produces: working `npx vitest run`, `npx next build`-able skeleton, `cn()` util at `@/lib/utils`, shadcn CLI configured.

- [ ] **Step 1: git init and baseline commit of handoff files**

```bash
cd /Users/muzza/Projects/gym-planner
git init -b main
printf 'node_modules/\n.next/\n.env*\n.DS_Store\ndev.log\n' > .gitignore
git add .gitignore SPEC.md PLAN.md README.md CLAUDE.md assets
git commit -m "chore: seed handoff package"
```

- [ ] **Step 2: Scaffold Next.js manually (avoid create-next-app clobbering existing files)**

```bash
npm init -y
npm i next@14 react@18 react-dom@18
npm i -D typescript @types/react @types/node @types/react-dom vitest tailwindcss@3 postcss autoprefixer tailwindcss-animate
npm i class-variance-authority clsx tailwind-merge lucide-react nanoid
```

Set in `package.json`: `"scripts": { "build": "next build", "start": "next start", "lint": "next lint", "test": "vitest run" }` (no `dev` changes needed; leave `"dev": "next dev"` for the already-running server).

- [ ] **Step 3: Copy design assets and data**

```bash
mkdir -p app data public
cp assets/design/globals.css app/globals.css
cp assets/design/tailwind.config.js tailwind.config.js
cp assets/design/postcss.config.mjs postcss.config.mjs
cp assets/design/components.json components.json
cp assets/public/* public/
cp assets/exercises.json data/exercises.json
```

- [ ] **Step 4: Write config + root layout**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017", "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve",
    "incremental": true, "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
export default {}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { include: ['lib/engine/__tests__/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname) } },
})
```

`lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workout Program Builder',
  description: 'Design a one-week repeating workout program',
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
```

`app/page.tsx` placeholder (replaced in Task 10):

```tsx
export default function Home() {
  return <main className="p-8">Workout Program Builder</main>
}
```

- [ ] **Step 5: Add shadcn primitives used later**

```bash
npx shadcn@latest add button input select popover badge card separator tabs textarea sheet toggle-group command label
```

(If the CLI balks at `"config": ""` in components.json, set `"tailwind": {"config": "tailwind.config.js", ...}` first.)

- [ ] **Step 6: Verify build and empty test run**

Run: `npx next build` → succeeds. `npx vitest run` → "No test files found" is acceptable at this point (exit 0 via `--passWithNoTests`? No — just proceed; first suite arrives in Task 2).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn + Vitest"
```

---

### Task 2: Engine — types + taxonomy

**Files:**
- Create: `lib/engine/types.ts`, `lib/engine/taxonomy.ts`
- Test: `lib/engine/__tests__/taxonomy.test.ts` (small; main suites come with each module)

**Interfaces:**
- Produces:
  - `types.ts`: `Focus`, `Experience`, `Goal`, `FocusTarget`, `Exercise`, `DayExercise`, `Day`, `Program`, `Muscle`, `MuscleGroup`, `TargetRange { min: number; ideal: number; max: number }`, `CoverageRow`, `RecoveryWarning` exactly as SPEC §4–7.
  - `taxonomy.ts`: `MUSCLES: Muscle[]` (22, in SPEC §5.1 order), `MUSCLE_GROUPS: Record<MuscleGroup, Muscle[]>`, `GROUPS: MuscleGroup[]`, `muscleGroupOf(m: Muscle): MuscleGroup`, `normalizeMuscle(name: string): Muscle | null` (canonical pass-through, aliases Brachialis→Biceps, Hip Flexors→Core, Upper Back→Rhomboids, anything else → null).

- [ ] **Step 1: Write `lib/engine/types.ts`**

```ts
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'

export type Muscle =
  | 'Chest' | 'Upper Chest' | 'Lower Chest'
  | 'Lats' | 'Rhomboids' | 'Mid Traps' | 'Lower Back' | 'Traps'
  | 'Shoulders' | 'Front Delts' | 'Side Delts' | 'Rear Delts'
  | 'Biceps' | 'Triceps' | 'Forearms'
  | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Adductors'
  | 'Core' | 'Obliques'

export type Focus = 'Hypertrophy' | 'Strength'
export type Experience = 'beginner' | 'intermediate' | 'advanced'

export type FocusTarget =
  | { kind: 'muscle'; muscle: Muscle }
  | { kind: 'group'; group: MuscleGroup }

export type Goal =
  | { mode: 'balanced' }
  | { mode: 'focused'; targets: FocusTarget[] }

export type ExerciseType = 'compound' | 'isolation' | 'isometric' | 'olympic' | 'plyometric'

export interface Exercise {
  id: string
  name: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  type: ExerciseType
}

export interface DayExercise {
  exerciseId: string
  name: string
  sets: number
  reps: string
  supersetId?: string
}

export interface Day {
  type: 'work' | 'rest'
  exercises: DayExercise[]
}

export interface Program {
  name: string
  description: string
  focus: Focus
  experience: Experience
  goal: Goal
  days: [Day, Day, Day, Day, Day, Day, Day]
  customExercises: Exercise[]
}

export interface TargetRange { min: number; ideal: number; max: number }

export interface MuscleVolume { sets: number; days: number[] }

export interface CoverageRow {
  muscle: Muscle
  group: MuscleGroup
  sets: number
  target: TargetRange
  status: 'none' | 'low' | 'ideal' | 'high'
  focused: boolean
}

export interface RecoveryWarning {
  id: string
  muscle: Muscle
  dayA: number
  dayB: number
  severity: 'critical' | 'warning'
  suggestion: number | null
}
```

- [ ] **Step 2: Write `lib/engine/taxonomy.ts`**

```ts
import type { Muscle, MuscleGroup } from './types'

export const MUSCLE_GROUPS: Record<MuscleGroup, Muscle[]> = {
  Chest: ['Chest', 'Upper Chest', 'Lower Chest'],
  Back: ['Lats', 'Rhomboids', 'Mid Traps', 'Lower Back', 'Traps'],
  Shoulders: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'],
  Arms: ['Biceps', 'Triceps', 'Forearms'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'],
  Core: ['Core', 'Obliques'],
}

export const GROUPS = Object.keys(MUSCLE_GROUPS) as MuscleGroup[]
export const MUSCLES = GROUPS.flatMap((g) => MUSCLE_GROUPS[g])

const GROUP_OF = new Map<Muscle, MuscleGroup>(
  GROUPS.flatMap((g) => MUSCLE_GROUPS[g].map((m) => [m, g] as const)),
)

export function muscleGroupOf(m: Muscle): MuscleGroup {
  return GROUP_OF.get(m)!
}

const ALIASES: Record<string, Muscle> = {
  Brachialis: 'Biceps',
  'Hip Flexors': 'Core',
  'Upper Back': 'Rhomboids',
}

const CANONICAL = new Set<string>(MUSCLES)

/** Canonical muscle for a library name; null for Full Body / unknown names. */
export function normalizeMuscle(name: string): Muscle | null {
  if (CANONICAL.has(name)) return name as Muscle
  return ALIASES[name] ?? null
}
```

- [ ] **Step 3: Write `lib/engine/__tests__/taxonomy.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { GROUPS, MUSCLES, muscleGroupOf, normalizeMuscle } from '../taxonomy'

describe('taxonomy', () => {
  it('has 22 muscles across 6 groups', () => {
    expect(MUSCLES).toHaveLength(22)
    expect(GROUPS).toEqual(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'])
  })

  it('maps muscles to groups', () => {
    expect(muscleGroupOf('Lats')).toBe('Back')
    expect(muscleGroupOf('Obliques')).toBe('Core')
  })

  it('normalizes aliases and rejects unknowns', () => {
    expect(normalizeMuscle('Chest')).toBe('Chest')
    expect(normalizeMuscle('Brachialis')).toBe('Biceps')
    expect(normalizeMuscle('Hip Flexors')).toBe('Core')
    expect(normalizeMuscle('Upper Back')).toBe('Rhomboids')
    expect(normalizeMuscle('Full Body')).toBeNull()
    expect(normalizeMuscle('Bogus')).toBeNull()
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/engine/__tests__/taxonomy.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): types and muscle taxonomy"
```

---

### Task 3: Engine — targets (TDD)

**Files:**
- Create: `lib/engine/targets.ts`
- Test: `lib/engine/__tests__/targets.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `taxonomy.ts` (`MUSCLES`, `MUSCLE_GROUPS`).
- Produces:
  - `BASE_IDEAL: Record<Focus, Record<Experience, Record<Muscle, number>>>`
  - `getFocusedMuscles(goal: Goal): Set<Muscle>` (group targets expand to member muscles; throws `Error('goal.targets must contain 1-2 targets')` when focused and `targets.length` is 0 or >2)
  - `getTargets(focus: Focus, experience: Experience, goal: Goal): Record<Muscle, TargetRange>`

- [ ] **Step 1: Write the failing test `lib/engine/__tests__/targets.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../taxonomy'
import { BASE_IDEAL, getFocusedMuscles, getTargets } from '../targets'

const balanced = { mode: 'balanced' } as const

describe('BASE_IDEAL', () => {
  it('spot-checks the hypertrophy table', () => {
    expect(BASE_IDEAL.Hypertrophy.beginner.Chest).toBe(12)
    expect(BASE_IDEAL.Hypertrophy.intermediate.Lats).toBe(12)
    expect(BASE_IDEAL.Hypertrophy.advanced.Quads).toBe(20)
    expect(BASE_IDEAL.Hypertrophy.beginner.Obliques).toBe(2)
    expect(BASE_IDEAL.Hypertrophy.advanced.Core).toBe(14)
  })

  it('derives Strength as round(0.75 · hypertrophy)', () => {
    for (const exp of ['beginner', 'intermediate', 'advanced'] as const) {
      for (const m of MUSCLES) {
        expect(BASE_IDEAL.Strength[exp][m]).toBe(Math.round(0.75 * BASE_IDEAL.Hypertrophy[exp][m]))
      }
    }
  })
})

describe('getTargets — balanced', () => {
  it('min = ceil(0.75·ideal), max = floor(1.25·ideal)', () => {
    const t = getTargets('Hypertrophy', 'intermediate', balanced)
    expect(t.Chest).toEqual({ min: 12, ideal: 16, max: 20 })
    expect(t.Forearms).toEqual({ min: 3, ideal: 4, max: 5 })
    expect(MUSCLES.every((m) => t[m].min <= t[m].ideal && t[m].ideal <= t[m].max)).toBe(true)
  })
})

describe('getTargets — focused', () => {
  const goal = { mode: 'focused', targets: [{ kind: 'muscle', muscle: 'Chest' }] } as const

  it('boosts the focused muscle 1.5x with MRV cap and old ideal as floor', () => {
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    // ideal 16 → round(1.5·16)=24, cap floor(1.25·20)=25 → idealF 24
    expect(t.Chest).toEqual({ min: 16, ideal: 24, max: 30 })
  })

  it('applies the MRV cap when 1.5x exceeds 1.25·advanced ideal', () => {
    const t = getTargets('Hypertrophy', 'advanced', goal)
    // ideal 20 → round(1.5·20)=30, cap floor(1.25·20)=25 → idealF 25, max floor(1.25·25)=31
    expect(t.Chest).toEqual({ min: 20, ideal: 25, max: 31 })
  })

  it('puts non-focused muscles on maintenance', () => {
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    // Lats ideal 12 → idealM max(round(4.8),2)=5, min max(3,1)=3, max 12
    expect(t.Lats).toEqual({ min: 3, ideal: 5, max: 12 })
    // Obliques ideal 4 → idealM max(round(1.6),2)=2, min max(1,1)=1, max 4
    expect(t.Obliques).toEqual({ min: 1, ideal: 2, max: 4 })
  })

  it('expands a group target to its member muscles', () => {
    const g = { mode: 'focused', targets: [{ kind: 'group', group: 'Arms' }] } as const
    const focused = getFocusedMuscles(g)
    expect(focused).toEqual(new Set(['Biceps', 'Triceps', 'Forearms']))
    const t = getTargets('Hypertrophy', 'intermediate', g)
    expect(t.Biceps.min).toBe(12) // boosted: floor is the old ideal
    expect(t.Chest.max).toBe(16) // maintenance: capped at old ideal
  })

  it('throws on more than 2 targets (and on zero)', () => {
    const three = {
      mode: 'focused',
      targets: [
        { kind: 'muscle', muscle: 'Chest' },
        { kind: 'muscle', muscle: 'Lats' },
        { kind: 'muscle', muscle: 'Quads' },
      ],
    } as const
    expect(() => getTargets('Hypertrophy', 'beginner', three)).toThrow()
    expect(() => getTargets('Hypertrophy', 'beginner', { mode: 'focused', targets: [] })).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/engine/__tests__/targets.test.ts`
Expected: FAIL — cannot resolve `../targets`

- [ ] **Step 3: Write `lib/engine/targets.ts`**

```ts
import type { Experience, Focus, Goal, Muscle, TargetRange } from './types'
import { MUSCLES, MUSCLE_GROUPS } from './taxonomy'

const HYPERTROPHY: Record<Experience, Record<Muscle, number>> = {
  beginner: {
    Chest: 12, 'Upper Chest': 4, 'Lower Chest': 4,
    Lats: 8, Rhomboids: 6, 'Mid Traps': 4, 'Lower Back': 4, Traps: 6,
    Shoulders: 12, 'Front Delts': 4, 'Side Delts': 6, 'Rear Delts': 6,
    Biceps: 8, Triceps: 8, Forearms: 2,
    Quads: 12, Hamstrings: 8, Glutes: 8, Calves: 8, Adductors: 2,
    Core: 6, Obliques: 2,
  },
  intermediate: {
    Chest: 16, 'Upper Chest': 6, 'Lower Chest': 6,
    Lats: 12, Rhomboids: 8, 'Mid Traps': 6, 'Lower Back': 6, Traps: 8,
    Shoulders: 16, 'Front Delts': 6, 'Side Delts': 8, 'Rear Delts': 8,
    Biceps: 12, Triceps: 12, Forearms: 4,
    Quads: 16, Hamstrings: 12, Glutes: 12, Calves: 12, Adductors: 4,
    Core: 10, Obliques: 4,
  },
  advanced: {
    Chest: 20, 'Upper Chest': 8, 'Lower Chest': 8,
    Lats: 16, Rhomboids: 12, 'Mid Traps': 10, 'Lower Back': 8, Traps: 12,
    Shoulders: 20, 'Front Delts': 8, 'Side Delts': 12, 'Rear Delts': 10,
    Biceps: 16, Triceps: 16, Forearms: 6,
    Quads: 20, Hamstrings: 16, Glutes: 16, Calves: 16, Adductors: 6,
    Core: 14, Obliques: 6,
  },
}

function derive(f: (h: number) => number, base: typeof HYPERTROPHY): typeof HYPERTROPHY {
  const out = {} as typeof HYPERTROPHY
  for (const exp of Object.keys(base) as Experience[]) {
    out[exp] = {} as Record<Muscle, number>
    for (const m of MUSCLES) out[exp][m] = f(base[exp][m])
  }
  return out
}

export const BASE_IDEAL: Record<Focus, Record<Experience, Record<Muscle, number>>> = {
  Hypertrophy: HYPERTROPHY,
  Strength: derive((h) => Math.round(0.75 * h), HYPERTROPHY),
}

export function getFocusedMuscles(goal: Goal): Set<Muscle> {
  if (goal.mode === 'balanced') return new Set()
  if (goal.targets.length < 1 || goal.targets.length > 2) {
    throw new Error('goal.targets must contain 1-2 targets')
  }
  const out = new Set<Muscle>()
  for (const t of goal.targets) {
    if (t.kind === 'muscle') out.add(t.muscle)
    else for (const m of MUSCLE_GROUPS[t.group]) out.add(m)
  }
  return out
}

export function getTargets(
  focus: Focus,
  experience: Experience,
  goal: Goal,
): Record<Muscle, TargetRange> {
  const focused = getFocusedMuscles(goal)
  const out = {} as Record<Muscle, TargetRange>
  for (const m of MUSCLES) {
    const ideal = BASE_IDEAL[focus][experience][m]
    if (goal.mode === 'balanced') {
      out[m] = { min: Math.ceil(0.75 * ideal), ideal, max: Math.floor(1.25 * ideal) }
    } else if (focused.has(m)) {
      const cap = Math.floor(1.25 * BASE_IDEAL[focus].advanced[m])
      const idealF = Math.min(Math.round(1.5 * ideal), cap)
      out[m] = { min: ideal, ideal: idealF, max: Math.floor(1.25 * idealF) }
    } else {
      const idealM = Math.max(Math.round(0.4 * ideal), 2)
      out[m] = { min: Math.max(Math.round(0.25 * ideal), 1), ideal: idealM, max: ideal }
    }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/engine/__tests__/targets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): volume targets with focused-goal boosts"
```

---

### Task 4: Engine — weekly volume (TDD)

**Files:**
- Create: `lib/engine/volume.ts`
- Test: `lib/engine/__tests__/volume.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `normalizeMuscle` from `taxonomy.ts`.
- Produces: `getWeeklyVolume(program: Program, exercises: Exercise[]): Record<Muscle, MuscleVolume>` — all 22 keys always present; `exercises` is the library, and `program.customExercises` are merged in (custom wins on id collision).

Test helpers used by this and later suites — define at the top of each test file that needs them (repeat, don't share):

```ts
import type { Day, DayExercise, Exercise, Program } from '../types'

const restDay: Day = { type: 'rest', exercises: [] }

function work(...exercises: DayExercise[]): Day {
  return { type: 'work', exercises }
}

function entry(exerciseId: string, sets: number, supersetId?: string): DayExercise {
  return { exerciseId, name: exerciseId, sets, reps: '8-12', supersetId }
}

function makeProgram(days: Day[], customExercises: Exercise[] = []): Program {
  const d = Array.from({ length: 7 }, (_, i) => days[i] ?? restDay)
  return {
    name: 'Test', description: '', focus: 'Hypertrophy', experience: 'intermediate',
    goal: { mode: 'balanced' }, days: d as Program['days'], customExercises,
  }
}

const LIB: Exercise[] = [
  { id: 'bench', name: 'Bench', equipment: 'Barbell', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], type: 'compound' },
  { id: 'curl', name: 'Curl', equipment: 'Dumbbell', primaryMuscles: ['Biceps'], secondaryMuscles: ['Brachialis'], type: 'isolation' },
  { id: 'thruster', name: 'Thruster', equipment: 'Barbell', primaryMuscles: ['Full Body'], secondaryMuscles: [], type: 'compound' },
  { id: 'mystery', name: 'Mystery', equipment: 'Cable', primaryMuscles: ['Weird Muscle'], secondaryMuscles: [], type: 'isolation' },
]
```

- [ ] **Step 1: Write the failing test `lib/engine/__tests__/volume.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../taxonomy'
import { getWeeklyVolume } from '../volume'
// ...paste the shared helpers block from the task header here...

describe('getWeeklyVolume', () => {
  it('counts primary at 1.0 and secondary at 0.5 sets', () => {
    const v = getWeeklyVolume(makeProgram([work(entry('bench', 4))]), LIB)
    expect(v.Chest.sets).toBe(4)
    expect(v.Triceps.sets).toBe(2)
    expect(v['Front Delts'].sets).toBe(2)
  })

  it('normalizes aliases (Brachialis → Biceps)', () => {
    const v = getWeeklyVolume(makeProgram([work(entry('curl', 4))]), LIB)
    expect(v.Biceps.sets).toBe(6) // 4 primary + 4·0.5 alias secondary
  })

  it('ignores Full Body and unknown muscle names without crashing', () => {
    const v = getWeeklyVolume(makeProgram([work(entry('thruster', 5), entry('mystery', 5))]), LIB)
    expect(MUSCLES.every((m) => v[m].sets === 0)).toBe(true)
  })

  it('ignores unknown exercise ids', () => {
    const v = getWeeklyVolume(makeProgram([work(entry('deleted-exercise', 5))]), LIB)
    expect(MUSCLES.every((m) => v[m].sets === 0)).toBe(true)
  })

  it('rounds to nearest 0.5 at the end', () => {
    // 3 sets secondary = 1.5
    const v = getWeeklyVolume(makeProgram([work(entry('bench', 3))]), LIB)
    expect(v.Triceps.sets).toBe(1.5)
  })

  it('collects sorted day indices the muscle was worked', () => {
    const v = getWeeklyVolume(
      makeProgram([work(entry('bench', 3)), restDay, restDay, work(entry('bench', 3))]),
      LIB,
    )
    expect(v.Chest.days).toEqual([0, 3])
    expect(v.Lats.days).toEqual([])
  })

  it('includes custom exercises and lets them win id collisions', () => {
    const custom: Exercise = { id: 'bench', name: 'Custom Bench', equipment: 'Machine', primaryMuscles: ['Upper Chest'], secondaryMuscles: [], type: 'compound' }
    const v = getWeeklyVolume(makeProgram([work(entry('bench', 4))], [custom]), LIB)
    expect(v['Upper Chest'].sets).toBe(4)
    expect(v.Chest.sets).toBe(0)
  })

  it('ignores supersets for volume', () => {
    const grouped = makeProgram([work(entry('bench', 4, 'ss1'), entry('curl', 3, 'ss1'))])
    const flat = makeProgram([work(entry('bench', 4), entry('curl', 3))])
    expect(getWeeklyVolume(grouped, LIB)).toEqual(getWeeklyVolume(flat, LIB))
  })

  it('always returns all 22 muscles', () => {
    const v = getWeeklyVolume(makeProgram([]), LIB)
    expect(Object.keys(v).sort()).toEqual([...MUSCLES].sort())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/engine/__tests__/volume.test.ts`
Expected: FAIL — cannot resolve `../volume`

- [ ] **Step 3: Write `lib/engine/volume.ts`**

```ts
import type { Exercise, Muscle, MuscleVolume, Program } from './types'
import { MUSCLES, normalizeMuscle } from './taxonomy'

export function getWeeklyVolume(
  program: Program,
  exercises: Exercise[],
): Record<Muscle, MuscleVolume> {
  const byId = new Map<string, Exercise>()
  for (const e of exercises) byId.set(e.id, e)
  for (const e of program.customExercises) byId.set(e.id, e)

  const sets = new Map<Muscle, number>(MUSCLES.map((m) => [m, 0]))
  const days = new Map<Muscle, Set<number>>(MUSCLES.map((m) => [m, new Set()]))

  program.days.forEach((day, dayIndex) => {
    if (day.type !== 'work') return
    for (const entry of day.exercises) {
      const ex = byId.get(entry.exerciseId)
      if (!ex) continue
      const add = (names: string[], factor: number) => {
        for (const name of names) {
          const m = normalizeMuscle(name)
          if (!m) continue
          sets.set(m, sets.get(m)! + entry.sets * factor)
          days.get(m)!.add(dayIndex)
        }
      }
      add(ex.primaryMuscles, 1)
      add(ex.secondaryMuscles, 0.5)
    }
  })

  const out = {} as Record<Muscle, MuscleVolume>
  for (const m of MUSCLES) {
    out[m] = { sets: Math.round(sets.get(m)! * 2) / 2, days: [...days.get(m)!].sort((a, b) => a - b) }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/engine/__tests__/volume.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): weekly volume calculation"
```

---

### Task 5: Engine — coverage (TDD)

**Files:**
- Create: `lib/engine/coverage.ts`
- Test: `lib/engine/__tests__/coverage.test.ts`

**Interfaces:**
- Consumes: `getTargets`, `getFocusedMuscles` from `targets.ts`; volume shape from Task 4.
- Produces: `getCoverage(volume: Record<Muscle, MuscleVolume>, targets: Record<Muscle, TargetRange>, goal: Goal): CoverageRow[]` — always 22 rows, SPEC §5.1 group order.

- [ ] **Step 1: Write the failing test `lib/engine/__tests__/coverage.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { Goal, Muscle, MuscleVolume } from '../types'
import { MUSCLES } from '../taxonomy'
import { getTargets } from '../targets'
import { getCoverage } from '../coverage'

const balanced: Goal = { mode: 'balanced' }
const targets = getTargets('Hypertrophy', 'intermediate', balanced) // Chest: 12/16/20

function volumeWith(setsByMuscle: Partial<Record<Muscle, number>>): Record<Muscle, MuscleVolume> {
  const out = {} as Record<Muscle, MuscleVolume>
  for (const m of MUSCLES) out[m] = { sets: setsByMuscle[m] ?? 0, days: setsByMuscle[m] ? [0] : [] }
  return out
}

describe('getCoverage', () => {
  it('returns all 22 muscles with group, in taxonomy order', () => {
    const rows = getCoverage(volumeWith({}), targets, balanced)
    expect(rows.map((r) => r.muscle)).toEqual(MUSCLES)
    expect(rows[0].group).toBe('Chest')
  })

  it('status boundaries: 0 → none, below min → low, at min/max → ideal, above max → high', () => {
    const rows = getCoverage(volumeWith({ Chest: 0, Lats: 8.5, Quads: 12, Biceps: 15, Core: 13 }), targets, balanced)
    const by = Object.fromEntries(rows.map((r) => [r.muscle, r.status]))
    expect(by.Chest).toBe('none')      // 0
    expect(by.Lats).toBe('low')        // 8.5 < min 9
    expect(by.Quads).toBe('ideal')     // 12 = min
    expect(by.Biceps).toBe('ideal')    // 15 = max
    expect(by.Core).toBe('high')       // 13 > max 12
  })

  it('flags focused muscles, including group expansion', () => {
    const goal: Goal = { mode: 'focused', targets: [{ kind: 'group', group: 'Arms' }] }
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    const rows = getCoverage(volumeWith({}), t, goal)
    const focused = rows.filter((r) => r.focused).map((r) => r.muscle)
    expect(focused).toEqual(['Biceps', 'Triceps', 'Forearms'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/engine/__tests__/coverage.test.ts`
Expected: FAIL — cannot resolve `../coverage`

- [ ] **Step 3: Write `lib/engine/coverage.ts`**

```ts
import type { CoverageRow, Goal, Muscle, MuscleVolume, TargetRange } from './types'
import { MUSCLES, muscleGroupOf } from './taxonomy'
import { getFocusedMuscles } from './targets'

export function getCoverage(
  volume: Record<Muscle, MuscleVolume>,
  targets: Record<Muscle, TargetRange>,
  goal: Goal,
): CoverageRow[] {
  const focused = getFocusedMuscles(goal)
  return MUSCLES.map((muscle) => {
    const sets = volume[muscle]?.sets ?? 0
    const target = targets[muscle]
    const status: CoverageRow['status'] =
      sets === 0 ? 'none' : sets < target.min ? 'low' : sets > target.max ? 'high' : 'ideal'
    return { muscle, group: muscleGroupOf(muscle), sets, target, status, focused: focused.has(muscle) }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/engine/__tests__/coverage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): coverage rows with status pills"
```

---

### Task 6: Engine — recovery (TDD)

**Files:**
- Create: `lib/engine/recovery.ts`
- Test: `lib/engine/__tests__/recovery.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `normalizeMuscle`.
- Produces: `getRecoveryWarnings(program: Program, exercises: Exercise[]): RecoveryWarning[]`. Warning `id` format: `` `${muscle}:${dayA}-${dayB}` ``.

Semantics (SPEC §7):
- Conflict: same muscle has volume on day `d` and `d+1` for `d` in 0..5 (no 6→0 wrap). Rest days have no volume, so they naturally break adjacency.
- `critical` when the muscle is primary (after alias normalization) on **both** days; else `warning`.
- Suggestion: candidate days `d ≠ dayB` where relocating the muscle's dayB session to `d` gives `|a-b| ≥ 2` for every pair in the muscle's resulting session-day set. Prefer candidates where `program.days[d].type === 'work'`; among equals pick the lowest index; `null` if none resolves.

- [ ] **Step 1: Write the failing test `lib/engine/__tests__/recovery.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { getRecoveryWarnings } from '../recovery'
// ...paste the shared helpers block (restDay/work/entry/makeProgram/LIB) from Task 4 here...

describe('getRecoveryWarnings', () => {
  it('flags the same muscle on consecutive days', () => {
    const w = getRecoveryWarnings(makeProgram([work(entry('bench', 3)), work(entry('bench', 3))]), LIB)
    const chest = w.find((x) => x.muscle === 'Chest')!
    expect(chest).toMatchObject({ dayA: 0, dayB: 1, severity: 'critical' })
  })

  it('does not flag when a rest day separates sessions', () => {
    const w = getRecoveryWarnings(
      makeProgram([work(entry('bench', 3)), restDay, work(entry('bench', 3))]),
      LIB,
    )
    expect(w).toHaveLength(0)
  })

  it('does not treat Sunday → Monday as adjacent', () => {
    const days = [work(entry('bench', 3)), restDay, restDay, restDay, restDay, restDay, work(entry('bench', 3))]
    expect(getRecoveryWarnings(makeProgram(days), LIB)).toHaveLength(0)
  })

  it('is warning severity when one side is secondary-only', () => {
    // bench: Triceps secondary. Add a triceps-primary exercise on day 1.
    const lib = [...LIB, { id: 'pushdown', name: 'Pushdown', equipment: 'Cable', primaryMuscles: ['Triceps'], secondaryMuscles: [], type: 'isolation' as const }]
    const w = getRecoveryWarnings(makeProgram([work(entry('bench', 3)), work(entry('pushdown', 3))]), lib)
    const tri = w.find((x) => x.muscle === 'Triceps')!
    expect(tri.severity).toBe('warning')
  })

  it('suggests a day ≥2 away, preferring work days', () => {
    // Chest on Mon+Tue; Thu is a work day (legs) → moving Tue’s chest to Thu resolves (|0-3|=3).
    const lib = [...LIB, { id: 'squat', name: 'Squat', equipment: 'Barbell', primaryMuscles: ['Quads'], secondaryMuscles: [], type: 'compound' as const }]
    const days = [work(entry('bench', 3)), work(entry('bench', 3)), restDay, work(entry('squat', 3))]
    const w = getRecoveryWarnings(makeProgram(days), lib)
    expect(w.find((x) => x.muscle === 'Chest')!.suggestion).toBe(3)
  })

  it('falls back to a rest day when no work day resolves', () => {
    // Chest Mon+Tue, only other work day is Wed (|1-2| would be… test uses no other work days) → suggests a rest day index ≥ 2 away.
    const days = [work(entry('bench', 3)), work(entry('bench', 3))]
    const w = getRecoveryWarnings(makeProgram(days), LIB)
    const s = w.find((x) => x.muscle === 'Chest')!.suggestion
    expect(s).not.toBeNull()
    expect(Math.abs(s! - 0)).toBeGreaterThanOrEqual(2)
  })

  it('returns null when no day resolves the conflict', () => {
    // Chest every single day → no relocation can create 2-day spacing.
    const days = Array.from({ length: 7 }, () => work(entry('bench', 3)))
    const w = getRecoveryWarnings(makeProgram(days), LIB)
    expect(w.length).toBeGreaterThan(0)
    expect(w.every((x) => x.muscle !== 'Chest' || x.suggestion === null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/engine/__tests__/recovery.test.ts`
Expected: FAIL — cannot resolve `../recovery`

- [ ] **Step 3: Write `lib/engine/recovery.ts`**

```ts
import type { Exercise, Muscle, Program, RecoveryWarning } from './types'
import { normalizeMuscle } from './taxonomy'

interface DayMuscleUse { any: boolean; primary: boolean }

function muscleUseByDay(program: Program, exercises: Exercise[]): Map<Muscle, DayMuscleUse>[] {
  const byId = new Map<string, Exercise>()
  for (const e of exercises) byId.set(e.id, e)
  for (const e of program.customExercises) byId.set(e.id, e)

  return program.days.map((day) => {
    const use = new Map<Muscle, DayMuscleUse>()
    if (day.type !== 'work') return use
    for (const entry of day.exercises) {
      const ex = byId.get(entry.exerciseId)
      if (!ex) continue
      const mark = (names: string[], primary: boolean) => {
        for (const name of names) {
          const m = normalizeMuscle(name)
          if (!m) continue
          const u = use.get(m) ?? { any: false, primary: false }
          u.any = true
          u.primary = u.primary || primary
          use.set(m, u)
        }
      }
      mark(ex.primaryMuscles, true)
      mark(ex.secondaryMuscles, false)
    }
    return use
  })
}

function suggestion(program: Program, muscle: Muscle, dayB: number, use: Map<Muscle, DayMuscleUse>[]): number | null {
  const sessions = use.flatMap((u, d) => (u.get(muscle)?.any ? [d] : []))
  const others = sessions.filter((d) => d !== dayB)
  const resolves = (d: number) => {
    const all = [...others, d]
    return all.every((a) => all.every((b) => a === b || Math.abs(a - b) >= 2))
  }
  const candidates = Array.from({ length: 7 }, (_, d) => d).filter((d) => d !== dayB && resolves(d))
  const workDay = candidates.find((d) => program.days[d].type === 'work')
  return workDay ?? candidates[0] ?? null
}

export function getRecoveryWarnings(program: Program, exercises: Exercise[]): RecoveryWarning[] {
  const use = muscleUseByDay(program, exercises)
  const warnings: RecoveryWarning[] = []
  for (let d = 0; d < 6; d++) {
    for (const [muscle, a] of use[d]) {
      const b = use[d + 1].get(muscle)
      if (!a.any || !b?.any) continue
      warnings.push({
        id: `${muscle}:${d}-${d + 1}`,
        muscle,
        dayA: d,
        dayB: d + 1,
        severity: a.primary && b.primary ? 'critical' : 'warning',
        suggestion: suggestion(program, muscle, d + 1, use),
      })
    }
  }
  return warnings
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/engine/__tests__/recovery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): recovery warnings with spacing suggestions"
```

---

### Task 7: Engine — supersets (TDD) + barrel

**Files:**
- Create: `lib/engine/superset.ts`, `lib/engine/index.ts`
- Test: `lib/engine/__tests__/superset.test.ts`

**Interfaces:**
- Produces:
  - `normalizeSupersets(day: Day): Day` — pure; returns a new Day where superset members are contiguous (groups keep first-occurrence order; members keep relative order) and groups with <2 members lose their `supersetId`.
  - `lib/engine/index.ts` re-exports everything: `export * from './types'; export * from './taxonomy'; export * from './targets'; export * from './volume'; export * from './coverage'; export * from './recovery'; export * from './superset'`.

- [ ] **Step 1: Write the failing test `lib/engine/__tests__/superset.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { Day, DayExercise } from '../types'
import { normalizeSupersets } from '../superset'

function e(exerciseId: string, supersetId?: string): DayExercise {
  return { exerciseId, name: exerciseId, sets: 3, reps: '10', supersetId }
}

describe('normalizeSupersets', () => {
  it('makes group members contiguous, preserving first-occurrence order', () => {
    const day: Day = { type: 'work', exercises: [e('a', 's1'), e('b'), e('c', 's1'), e('d')] }
    const out = normalizeSupersets(day)
    expect(out.exercises.map((x) => x.exerciseId)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('dissolves single-member groups', () => {
    const day: Day = { type: 'work', exercises: [e('a', 's1'), e('b')] }
    const out = normalizeSupersets(day)
    expect(out.exercises[0].supersetId).toBeUndefined()
  })

  it('leaves already-normalized days structurally equal', () => {
    const day: Day = { type: 'work', exercises: [e('a', 's1'), e('b', 's1'), e('c')] }
    expect(normalizeSupersets(day)).toEqual(day)
  })

  it('does not mutate its input', () => {
    const day: Day = { type: 'work', exercises: [e('a', 's1'), e('b'), e('c', 's1')] }
    const snapshot = JSON.parse(JSON.stringify(day))
    normalizeSupersets(day)
    expect(day).toEqual(snapshot)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/engine/__tests__/superset.test.ts`
Expected: FAIL — cannot resolve `../superset`

- [ ] **Step 3: Write `lib/engine/superset.ts` and `lib/engine/index.ts`**

```ts
import type { Day, DayExercise } from './types'

/** Enforce superset invariants: members contiguous, groups of <2 dissolved. Pure. */
export function normalizeSupersets(day: Day): Day {
  const counts = new Map<string, number>()
  for (const ex of day.exercises) {
    if (ex.supersetId) counts.set(ex.supersetId, (counts.get(ex.supersetId) ?? 0) + 1)
  }

  const placed = new Set<string>()
  const exercises: DayExercise[] = []
  for (const ex of day.exercises) {
    const id = ex.supersetId
    if (!id || (counts.get(id) ?? 0) < 2) {
      exercises.push(id ? { ...ex, supersetId: undefined } : ex)
      continue
    }
    if (placed.has(id)) continue
    placed.add(id)
    for (const member of day.exercises) {
      if (member.supersetId === id) exercises.push(member)
    }
  }
  return { ...day, exercises }
}
```

`lib/engine/index.ts`:

```ts
export * from './types'
export * from './taxonomy'
export * from './targets'
export * from './volume'
export * from './coverage'
export * from './recovery'
export * from './superset'
```

- [ ] **Step 4: Run the full engine suite**

Run: `npx vitest run`
Expected: all 5+ suites PASS

- [ ] **Step 5: Commit**

```bash
git add lib/engine
git commit -m "feat(engine): superset normalization and barrel export"
```

---

### Task 8: Prisma + API routes

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `lib/serialize.ts`, `app/api/programs/route.ts`, `app/api/programs/[shareId]/route.ts`, `.env.example`

**Interfaces:**
- Consumes: `Program` type from engine.
- Produces:
  - `POST /api/programs` body `{ data: Program }` or `{ copyOf: string }` → 200 `{ editId, viewId }` (copy also sets `parentId`, returns fresh ids)
  - `GET /api/programs/[shareId]` → `{ data, access: 'edit', editId, viewId }` for editId; `{ data, access: 'view', viewId }` for viewId (never editId); 404 unknown
  - `PUT /api/programs/[shareId]` body `{ data }` → `{ ok: true }`; **403 when shareId is a viewId**; 404 unknown
  - `lib/db.ts` exports `prisma` singleton.

- [ ] **Step 1: Install and configure Prisma**

```bash
npm i @prisma/client
npm i -D prisma
```

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Program {
  id        String   @id @default(cuid())
  editId    String   @unique
  viewId    String   @unique
  data      Json
  parentId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`.env.example`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/gym_planner"
```

Run `npx prisma generate`. Run `npx prisma migrate dev --name init` only if `DATABASE_URL` is set in `.env`; otherwise note it as a deploy step (do not block the build on it).

- [ ] **Step 2: Write `lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Write `app/api/programs/route.ts` (POST)**

```ts
import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { prisma } from '@/lib/db'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)

export async function POST(req: Request) {
  const body = await req.json()

  if (typeof body.copyOf === 'string') {
    const source = await prisma.program.findFirst({
      where: { OR: [{ editId: body.copyOf }, { viewId: body.copyOf }] },
    })
    if (!source) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const created = await prisma.program.create({
      data: { editId: nanoid(), viewId: nanoid(), data: source.data as object, parentId: source.id },
    })
    return NextResponse.json({ editId: created.editId, viewId: created.viewId })
  }

  if (!body.data) return NextResponse.json({ error: 'data required' }, { status: 400 })
  const created = await prisma.program.create({
    data: { editId: nanoid(), viewId: nanoid(), data: body.data },
  })
  return NextResponse.json({ editId: created.editId, viewId: created.viewId })
}
```

- [ ] **Step 4: Write `app/api/programs/[shareId]/route.ts` (GET, PUT)**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: { shareId: string } }

export async function GET(_req: Request, { params }: Params) {
  const { shareId } = params
  const record = await prisma.program.findFirst({
    where: { OR: [{ editId: shareId }, { viewId: shareId }] },
  })
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (record.editId === shareId) {
    return NextResponse.json({ data: record.data, access: 'edit', editId: record.editId, viewId: record.viewId })
  }
  return NextResponse.json({ data: record.data, access: 'view', viewId: record.viewId })
}

export async function PUT(req: Request, { params }: Params) {
  const { shareId } = params
  const record = await prisma.program.findFirst({
    where: { OR: [{ editId: shareId }, { viewId: shareId }] },
  })
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (record.editId !== shareId) return NextResponse.json({ error: 'read-only link' }, { status: 403 })
  const body = await req.json()
  if (!body.data) return NextResponse.json({ error: 'data required' }, { status: 400 })
  await prisma.program.update({ where: { id: record.id }, data: { data: body.data } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: succeeds (Prisma client generated; no DB connection needed at build).

- [ ] **Step 6: Commit**

```bash
git add prisma lib/db.ts app/api .env.example package.json package-lock.json
git commit -m "feat: prisma schema and capability-URL program API"
```

---

### Task 9: Client program state + autosave

**Files:**
- Create: `lib/defaults.ts`, `hooks/use-program.ts`, `lib/exercises.ts`

**Interfaces:**
- Consumes: engine barrel, API routes from Task 8.
- Produces:
  - `lib/exercises.ts`: `import library from '@/data/exercises.json'`; exports `LIBRARY: Exercise[]` and `allExercises(program: Program): Exercise[]` (library + customs, custom wins by id).
  - `lib/defaults.ts`: `defaultProgram(): Program` — name "My Program", empty description, Hypertrophy/intermediate/balanced, days: Mon/Tue/Thu/Fri work + Wed/Sat/Sun rest, all empty, no customs.
  - `hooks/use-program.ts`: `useProgram(initial?: { program: Program; editId: string })` returning `{ program, setProgram, saveState: 'saved' | 'saving' | 'error', editId, viewId, retry }`. Behavior: any `setProgram` marks dirty → 1 s debounce → if no `editId` yet, `POST /api/programs` then store `editId` in `localStorage['gym-planner:editId']` and keep `viewId`; else `PUT /api/programs/{editId}`. On fetch failure set `saveState: 'error'`; `retry()` re-runs the save. Derived values are computed by callers via `useMemo` on `program` (engine calls stay in components, state hook stays persistence-only).

- [ ] **Step 1: Write `lib/exercises.ts` and `lib/defaults.ts`**

```ts
// lib/exercises.ts
import type { Exercise, Program } from '@/lib/engine'
import library from '@/data/exercises.json'

export const LIBRARY = library as Exercise[]

export function allExercises(program: Program): Exercise[] {
  const byId = new Map(LIBRARY.map((e) => [e.id, e]))
  for (const e of program.customExercises) byId.set(e.id, e)
  return [...byId.values()]
}
```

```ts
// lib/defaults.ts
import type { Day, Program } from '@/lib/engine'

const workDay: Day = { type: 'work', exercises: [] }
const restDay: Day = { type: 'rest', exercises: [] }

export function defaultProgram(): Program {
  return {
    name: 'My Program',
    description: '',
    focus: 'Hypertrophy',
    experience: 'intermediate',
    goal: { mode: 'balanced' },
    days: [
      { ...workDay }, { ...workDay }, { ...restDay }, { ...workDay },
      { ...workDay }, { ...restDay }, { ...restDay },
    ],
    customExercises: [],
  }
}
```

- [ ] **Step 2: Write `hooks/use-program.ts`**

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Program } from '@/lib/engine'

export type SaveState = 'saved' | 'saving' | 'error'

const STORAGE_KEY = 'gym-planner:editId'

export function useProgram(initial: { program: Program; editId?: string; viewId?: string }) {
  const [program, setProgramState] = useState(initial.program)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [editId, setEditId] = useState<string | undefined>(initial.editId)
  const [viewId, setViewId] = useState<string | undefined>(initial.viewId)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const latest = useRef(program)
  const ids = useRef({ editId, viewId })
  ids.current = { editId, viewId }

  const save = useCallback(async () => {
    setSaveState('saving')
    try {
      if (!ids.current.editId) {
        const res = await fetch('/api/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: latest.current }),
        })
        if (!res.ok) throw new Error('save failed')
        const { editId: e, viewId: v } = await res.json()
        setEditId(e)
        setViewId(v)
        localStorage.setItem(STORAGE_KEY, e)
      } else {
        const res = await fetch(`/api/programs/${ids.current.editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: latest.current }),
        })
        if (!res.ok) throw new Error('save failed')
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [])

  const setProgram = useCallback(
    (update: Program | ((p: Program) => Program)) => {
      setProgramState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update
        latest.current = next
        clearTimeout(timer.current)
        timer.current = setTimeout(save, 1000)
        return next
      })
    },
    [save],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return { program, setProgram, saveState, editId, viewId, retry: save }
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/exercises.ts lib/defaults.ts hooks
git commit -m "feat: program state hook with debounced autosave"
```

---

### Task 10: Editor shell — header, setup bar, theme

**Files:**
- Create: `app/page.tsx`, `components/editor.tsx`, `components/header.tsx`, `components/setup-bar.tsx`, `components/theme-toggle.tsx`, `components/theme-provider.tsx`
- Modify: `app/layout.tsx` (wrap in ThemeProvider)

**Interfaces:**
- Consumes: `useProgram`, `defaultProgram`, engine (`getTargets`), shadcn primitives.
- Produces:
  - `<Editor initial={{ program, editId?, viewId? }} readOnly={false} />` — top-level client component used by `/` and `/s/[shareId]`; owns `useProgram` and renders Header + SetupBar + Planner + Analytics (Planner/Analytics arrive in Tasks 11–13; render placeholder `<div>`s until then and replace within those tasks).
  - `<Header program onChangeName onChangeDescription saveState editId viewId readOnly onCopyProgram? />`
  - `<SetupBar program onChange readOnly />` — focus toggle-group, experience Select, goal picker (Balanced / Focused; focused opens a Popover + Command listing 6 groups then 22 muscles; max 2 selections rendered as removable Badge chips; selecting a 3rd is disabled, not an error).
  - Theme: `next-themes` (`npm i next-themes`), `darkMode: ["class"]` already in tailwind config; `<ThemeToggle />` = shadcn Button with sun/moon lucide icons.

- [ ] **Step 1: Install next-themes and write providers**

```bash
npm i next-themes
```

`components/theme-provider.tsx`:

```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
```

Wrap `{children}` with `<ThemeProvider>` in `app/layout.tsx`.

`components/theme-toggle.tsx`:

```tsx
'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  )
}
```

- [ ] **Step 2: Write `components/header.tsx`**

Inline-editable name (borderless `<input>` styled `text-lg font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded px-1`) and description (same pattern, `text-sm text-muted-foreground`). Save indicator: small muted text — `saved` → "Saved", `saving` → "Saving…", `error` → red "Save failed — Retry" button calling `retry`. Share: shadcn Popover with two rows, each a Button (variant ghost, `Copy view link` / `Copy edit link`) that does `navigator.clipboard.writeText(`${location.origin}/s/${id}`)` and flips its label to "Copied!" for 1.5 s; rows disabled with hint "Saves first…" until ids exist. In `readOnly` mode: name/description are plain text, no share popover, and a primary Button "Copy this program" calls `onCopyProgram`. `<ThemeToggle />` at far right.

- [ ] **Step 3: Write `components/setup-bar.tsx`**

Single row, `flex flex-wrap items-center gap-3 border-b px-4 py-2`:
- Focus: shadcn ToggleGroup type="single" values `Hypertrophy` / `Strength`.
- Experience: shadcn Select with `beginner` / `intermediate` / `advanced` (labels capitalized).
- Goal: ToggleGroup `balanced` / `focused`. When focused: Popover anchored to a "+ Add focus" Button containing a Command list — group items first (`Chest … Core`, labeled "group"), then all 22 muscles; picking adds `{kind:'group',group}` or `{kind:'muscle',muscle}` to `goal.targets` (skip duplicates); when `targets.length === 2` the list items render disabled. Chips: shadcn Badge per target with an ✕ button removing it. Switching to focused with no target defaults to `targets: [{ kind: 'group', group: 'Chest' }]` so `getTargets` never sees an empty list; switching to balanced discards targets.
- All controls disabled when `readOnly`.

- [ ] **Step 4: Write `components/editor.tsx` and `app/page.tsx`**

```tsx
// components/editor.tsx
'use client'

import { useMemo } from 'react'
import { getCoverage, getRecoveryWarnings, getTargets, getWeeklyVolume, type Program } from '@/lib/engine'
import { allExercises } from '@/lib/exercises'
import { useProgram } from '@/hooks/use-program'
import { Header } from '@/components/header'
import { SetupBar } from '@/components/setup-bar'

export function Editor({
  initial,
  readOnly = false,
  onCopyProgram,
}: {
  initial: { program: Program; editId?: string; viewId?: string }
  readOnly?: boolean
  onCopyProgram?: () => void
}) {
  const { program, setProgram, saveState, editId, viewId, retry } = useProgram(initial)
  const exercises = useMemo(() => allExercises(program), [program])
  const targets = useMemo(
    () => getTargets(program.focus, program.experience, program.goal),
    [program.focus, program.experience, program.goal],
  )
  const volume = useMemo(() => getWeeklyVolume(program, exercises), [program, exercises])
  const coverage = useMemo(() => getCoverage(volume, targets, program.goal), [volume, targets, program.goal])
  const warnings = useMemo(() => getRecoveryWarnings(program, exercises), [program, exercises])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        program={program}
        readOnly={readOnly}
        saveState={saveState}
        editId={editId}
        viewId={viewId}
        retry={retry}
        onCopyProgram={onCopyProgram}
        onChangeName={(name) => setProgram((p) => ({ ...p, name }))}
        onChangeDescription={(description) => setProgram((p) => ({ ...p, description }))}
      />
      <SetupBar program={program} readOnly={readOnly} onChange={setProgram} />
      <div className="flex flex-1 gap-4 p-4 max-lg:flex-col">
        <div className="min-w-0 lg:w-2/3">{/* Planner — Task 11/12 */}</div>
        <div className="lg:w-1/3">{/* Analytics — Task 13 */}</div>
      </div>
    </div>
  )
}
```

`app/page.tsx` (client bootstrap: look up `localStorage['gym-planner:editId']`; if present `GET /api/programs/{id}`, else `defaultProgram()`):

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { Program } from '@/lib/engine'
import { defaultProgram } from '@/lib/defaults'
import { Editor } from '@/components/editor'

export default function Home() {
  const [initial, setInitial] = useState<{ program: Program; editId?: string; viewId?: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('gym-planner:editId')
    if (!stored) return setInitial({ program: defaultProgram() })
    fetch(`/api/programs/${stored}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) =>
        body.access === 'edit'
          ? setInitial({ program: body.data, editId: body.editId, viewId: body.viewId })
          : setInitial({ program: defaultProgram() }),
      )
      .catch(() => setInitial({ program: defaultProgram() }))
  }, [])

  if (!initial) return null
  return <Editor initial={initial} />
}
```

- [ ] **Step 5: Verify in browser**

`npx next build` passes; check http://localhost:3000 renders header + setup bar, theme toggle flips dark mode, goal picker enforces the 2-chip max, name edits show "Saving…" then "Saved" (or "Save failed" without a DB — acceptable until DATABASE_URL exists).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: editor shell with header, setup bar, theming"
```

---

### Task 11: Planner — day columns, exercise cards, add & custom exercises

**Files:**
- Create: `components/planner.tsx`, `components/day-column.tsx`, `components/exercise-card.tsx`, `components/add-exercise.tsx`, `components/custom-exercise-sheet.tsx`
- Modify: `components/editor.tsx` (render `<Planner />` in the 2/3 slot)

**Interfaces:**
- Consumes: engine types, `normalizeSupersets`, `LIBRARY`/`allExercises`, `setProgram` from Editor.
- Produces:
  - `<Planner program onChange readOnly warningsByDay={Map<number, RecoveryWarning[]>} />` — 7 columns Mon–Sun (`DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']` exported from `components/planner.tsx`), grid `grid grid-cols-7 gap-2 min-w-[1100px]` inside `overflow-x-auto`.
  - `<DayColumn dayIndex day onChangeDay readOnly exercises />` — header: day name + work/rest Switch-style toggle (Button variant ghost, text "Rest day"/"Work day"); rest days render muted empty state; all mutations pass the day through `normalizeSupersets` before calling `onChangeDay`.
  - `<ExerciseCard entry onUpdate onRemove readOnly dragHandleProps? selected onToggleSelect />` — name, sets stepper (− / value / + Buttons, clamp 1–10), reps `<Input className="h-7 w-16" />` free text, remove ✕, checkbox-on-hover for superset multi-select.
  - `<AddExercise exercises onAdd onCreateCustom />` — bottom of each work day: shadcn Command input filtering by name/equipment/muscle; item click → `onAdd(exercise)` appending `{ exerciseId: ex.id, name: ex.name, sets: 3, reps: '8-12' }`; footer item "+ Create custom exercise" → opens sheet.
  - `<CustomExerciseSheet open onOpenChange onCreate />` — shadcn Sheet (slide-out): name Input, equipment Input, primary/secondary muscle multi-selects offering **only the 22 canonical muscles** (Command multi-select with Badges), type ToggleGroup limited to compound/isolation. `onCreate` produces `Exercise` with `id: 'custom-' + crypto.randomUUID().slice(0, 8)` and appends to `program.customExercises`.

- [ ] **Step 1: Write the five components** per the interface block above. Mutation pattern every handler uses:

```tsx
const setDay = (dayIndex: number, next: Day) =>
  onChange((p) => {
    const days = [...p.days] as Program['days']
    days[dayIndex] = normalizeSupersets(next)
    return { ...p, days }
  })
```

- [ ] **Step 2: Wire `<Planner />` into `components/editor.tsx`**, passing `warningsByDay` built from Task 10's `warnings` memo:

```tsx
const warningsByDay = useMemo(() => {
  const m = new Map<number, RecoveryWarning[]>()
  for (const w of warnings) m.set(w.dayB, [...(m.get(w.dayB) ?? []), w])
  return m
}, [warnings])
```

- [ ] **Step 3: Verify in browser** — add exercises via search, steppers clamp 1–10, work/rest toggle clears nothing (exercises are kept in state but hidden? No — SPEC: rest days have empty `exercises`; toggling to rest **clears** the list after a `confirm()` when non-empty), custom exercise appears in the library list and counts volume.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: planner with day columns, exercise cards, custom exercises"
```

---

### Task 12: Drag-and-drop + superset UI

**Files:**
- Modify: `components/planner.tsx`, `components/day-column.tsx`, `components/exercise-card.tsx`

**Interfaces:**
- Consumes: dnd-kit (`npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`), `normalizeSupersets`.
- Produces:
  - DnD within and between days: `DndContext` in Planner + one `SortableContext` per day. Sortable ids: single exercises use `` `${dayIndex}:${indexInDay}` ``; a superset group is **one** sortable unit (wrapper component `SupersetBlock`) whose id is `` `${dayIndex}:ss:${supersetId}` `` so the group drags as a whole. Drop between days moves the entry/group and re-normalizes both source and target days.
  - Dragging a member out of its group: the member is rendered sortable *inside* the block only for reorder-within-group; dragging it past the block boundary removes its `supersetId` (then `normalizeSupersets` dissolves a leftover singleton).
  - Superset creation: cards expose selection checkboxes; Planner keeps `selected: Set<string>` of `dayIndex:index` keys **within one day only** (selecting in another day resets). When ≥2 **adjacent** selected, a floating "Group as superset" Button appears → assigns `supersetId: 'ss-' + crypto.randomUUID().slice(0, 8)` to those entries. Grouped cards render inside `SupersetBlock`: `border-l-2 border-primary rounded-md bg-primary/5` bracket + "Superset" label + "Ungroup" button (clears ids).
  - Long-press activation for touch: `PointerSensor` with `activationConstraint: { distance: 5 }` plus `TouchSensor` with `activationConstraint: { delay: 250, tolerance: 8 }`.
  - All drag affordances hidden when `readOnly`.

- [ ] **Step 1: Install dnd-kit and implement** per interface block. `onDragEnd` handler outline:

```tsx
function onDragEnd(event: DragEndEvent) {
  const from = parseId(event.active.id as string)   // { day, index } | { day, supersetId }
  const over = event.over ? parseId(event.over.id as string) : null
  if (!over) return
  onChange((p) => {
    const days = [...p.days] as Program['days']
    const moved = extract(days, from)               // removes entry or whole group, returns DayExercise[]
    if (from.day !== over.day) moved.forEach((m) => { if (!('supersetId' in from)) m.supersetId = undefined })
    insertAt(days, over, moved)
    days[from.day] = normalizeSupersets(days[from.day])
    days[over.day] = normalizeSupersets(days[over.day])
    return { ...p, days }
  })
}
```

- [ ] **Step 2: Verify in browser** — reorder within a day, move between days, group two adjacent cards, grouped block drags as one, ungroup restores singles, dissolving to one member clears the group.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: drag-and-drop and superset grouping"
```

---

### Task 13: Analytics panel

**Files:**
- Create: `components/analytics.tsx`, `components/recovery-warnings.tsx`, `components/coverage-table.tsx`
- Modify: `components/editor.tsx` (render `<Analytics />` in the 1/3 slot, `className="lg:sticky lg:top-4 lg:self-start"`)

**Interfaces:**
- Consumes: `coverage: CoverageRow[]`, `warnings: RecoveryWarning[]`, `DAY_NAMES` from planner.
- Produces:
  - `<Analytics coverage warnings />`
  - `<RecoveryWarnings warnings />` — card list at top; critical rows `border-destructive/50 bg-destructive/10 text-destructive`, warning rows amber (`border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400`). Copy: `"{muscle} trained {DayA} and {DayB}"` + hint `"e.g. move {DayB}'s {muscle} work to {DAY_NAMES[suggestion]}"` or `"no free day gives 48 h spacing"` when suggestion is null. Empty state: green check + "No recovery conflicts".
  - `<CoverageTable coverage />` — six group sections. Group header row: group name + summed sets. Muscle rows: name (★ flame `Flame` lucide icon `text-primary` when `focused`), `"{sets} / {min}–{max}"`, status Badge: `none` → secondary variant "untrained", `low` → amber "low", `ideal` → green (`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`) "ideal", `high` → destructive "high".

- [ ] **Step 1: Write the three components** per interface block and mount in Editor.

- [ ] **Step 2: Verify in browser** — coverage reacts instantly to setup-bar changes; put chest work on Mon+Tue and see a red warning with a concrete suggestion day.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: analytics panel with recovery warnings and coverage table"
```

---

### Task 14: Shared view route + copy program

**Files:**
- Create: `app/s/[shareId]/page.tsx`
- Modify: `components/editor.tsx` / `components/header.tsx` only if gaps found (readOnly plumbing exists since Task 10)

**Interfaces:**
- Consumes: `GET /api/programs/[shareId]`, `POST /api/programs { copyOf }`, `<Editor readOnly />`.
- Produces: `/s/{shareId}` — fetches the share id; `access: 'view'` renders `<Editor readOnly onCopyProgram={copy} />`; `access: 'edit'` renders a full editor whose `useProgram` PUTs to that editId (pass `editId` in `initial`). `copy` = `POST { copyOf: shareId }` → store new `editId` in localStorage → `location.href = '/'`. Unknown id → simple "Program not found" screen with a link home.

- [ ] **Step 1: Write `app/s/[shareId]/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Program } from '@/lib/engine'
import { Editor } from '@/components/editor'

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; program: Program; access: 'edit' | 'view'; editId?: string; viewId?: string }

export default function SharedProgram() {
  const { shareId } = useParams<{ shareId: string }>()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    fetch(`/api/programs/${shareId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setState({ status: 'ready', program: b.data, access: b.access, editId: b.editId, viewId: b.viewId }))
      .catch(() => setState({ status: 'missing' }))
  }, [shareId])

  if (state.status === 'loading') return null
  if (state.status === 'missing') {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-lg font-medium">Program not found</p>
          <a className="text-primary underline" href="/">Build your own</a>
        </div>
      </main>
    )
  }

  const copy = async () => {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copyOf: shareId }),
    })
    if (!res.ok) return
    const { editId } = await res.json()
    localStorage.setItem('gym-planner:editId', editId)
    location.href = '/'
  }

  return (
    <Editor
      initial={{ program: state.program, editId: state.editId, viewId: state.viewId }}
      readOnly={state.access === 'view'}
      onCopyProgram={state.access === 'view' ? copy : undefined}
    />
  )
}
```

- [ ] **Step 2: Verify** — with a DB: create a program, open view link (no edit affordances anywhere, copy works, editId absent from the network response), open edit link (full editing). Without a DB: `npx next build` passes and the route renders "Program not found".

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: shared view/edit routes with copy-program"
```

---

### Task 15: Mobile layout

**Files:**
- Create: `components/mobile-day-pager.tsx`, `components/analytics-sheet.tsx`
- Modify: `components/planner.tsx` (desktop grid hidden `max-lg:hidden`; pager `lg:hidden`), `components/editor.tsx` (analytics: sticky aside on `lg+`, bottom sheet below)

**Interfaces:**
- Consumes: `DayColumn` (reused one-at-a-time), shadcn Sheet/Tabs, coverage + warnings.
- Produces:
  - `<MobileDayPager program onChange readOnly exercises warningsByDay />` — Mon–Sun tab strip (shadcn Tabs, short labels `Mon…Sun`); shows one `DayColumn` full-width; opens on `(new Date().getDay() + 6) % 7` (current weekday, Monday-indexed); horizontal swipe via simple `onTouchStart`/`onTouchEnd` deltaX > 48 px switches day.
  - `<AnalyticsSheet coverage warnings />` — fixed bottom bar (`lg:hidden fixed bottom-0 inset-x-0 border-t bg-background`) peek header: `"{n} warnings · {ideal}/{22} muscles on target"`; tapping opens shadcn Sheet side="bottom" (`h-[80vh] overflow-y-auto`) containing `<Analytics />`.
  - Editing stays enabled on mobile (same components); dnd falls back to the Task 12 long-press TouchSensor within the visible day.

- [ ] **Step 1: Implement both components and responsive wiring** per interface block.

- [ ] **Step 2: Verify in browser** at 390 px width — day pager swipes, tab strip works, bottom sheet peeks and opens, desktop unchanged at 1440 px.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: mobile day pager and analytics bottom sheet"
```

---

### Task 16: Final verification

- [ ] **Step 1: Full test suite** — `npx vitest run` → all suites pass.
- [ ] **Step 2: Production build** — `npx next build` → passes.
- [ ] **Step 3: Spec sweep** — walk SPEC.md §4–10 checking each behavior in the running app at http://localhost:3000; fix gaps found (each fix: change → re-run tests/build → commit).
- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: spec-sweep fixes"
```
