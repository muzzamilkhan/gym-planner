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
