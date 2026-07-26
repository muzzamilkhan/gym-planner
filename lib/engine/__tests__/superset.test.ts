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
