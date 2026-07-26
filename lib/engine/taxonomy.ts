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
