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
