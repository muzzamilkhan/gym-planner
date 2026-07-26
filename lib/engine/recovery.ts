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

function suggestion(
  program: Program,
  muscle: Muscle,
  dayB: number,
  use: Map<Muscle, DayMuscleUse>[],
): number | null {
  const sessions = use.flatMap((u, d) => (u.get(muscle)?.any ? [d] : []))
  const others = sessions.filter((d) => d !== dayB)
  const resolves = (d: number) => {
    const all = [...others, d]
    return all.every((a) => all.every((b) => a === b || Math.abs(a - b) >= 2))
  }
  const candidates = Array.from({ length: 7 }, (_, d) => d).filter(
    (d) => d !== dayB && !others.includes(d) && resolves(d),
  )
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
