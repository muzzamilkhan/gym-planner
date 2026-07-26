import { describe, expect, it } from 'vitest'
import type { Day, DayExercise, Exercise, Program } from '../types'
import { MUSCLES } from '../taxonomy'
import { getWeeklyVolume } from '../volume'

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
