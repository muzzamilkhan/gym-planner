import type { Exercise, Program } from '@/lib/engine'
import library from '@/data/exercises.json'

export const LIBRARY = library as Exercise[]

export function allExercises(program: Program): Exercise[] {
  const byId = new Map(LIBRARY.map((e) => [e.id, e]))
  for (const e of program.customExercises) byId.set(e.id, e)
  return [...byId.values()]
}
