import { describe, expect, it } from 'vitest'
import type { Day, DayExercise, Exercise, Program } from '../types'
import { getRecoveryWarnings } from '../recovery'

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
]

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
    // Chest on Mon+Tue; Thu is a work day (legs) → moving Tue's chest to Thu resolves (|0-3|=3).
    const lib = [...LIB, { id: 'squat', name: 'Squat', equipment: 'Barbell', primaryMuscles: ['Quads'], secondaryMuscles: [], type: 'compound' as const }]
    const days = [work(entry('bench', 3)), work(entry('bench', 3)), restDay, work(entry('squat', 3))]
    const w = getRecoveryWarnings(makeProgram(days), lib)
    expect(w.find((x) => x.muscle === 'Chest')!.suggestion).toBe(3)
  })

  it('falls back to a rest day when no work day resolves', () => {
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
