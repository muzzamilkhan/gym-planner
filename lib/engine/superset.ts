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
