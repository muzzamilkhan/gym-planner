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
