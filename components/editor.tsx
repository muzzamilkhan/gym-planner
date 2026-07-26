'use client'

import { useMemo } from 'react'
import {
  getCoverage,
  getRecoveryWarnings,
  getTargets,
  getWeeklyVolume,
  type Program,
  type RecoveryWarning,
} from '@/lib/engine'
import { allExercises } from '@/lib/exercises'
import { useProgram } from '@/hooks/use-program'
import { Analytics } from '@/components/analytics'
import { AnalyticsSheet } from '@/components/analytics-sheet'
import { Header } from '@/components/header'
import { Planner } from '@/components/planner'
import { SetupBar } from '@/components/setup-bar'

export function Editor({
  initial,
  readOnly = false,
  onCopyProgram,
}: {
  initial: { program: Program; editId?: string; viewId?: string }
  readOnly?: boolean
  onCopyProgram?: () => void
}) {
  const { program, setProgram, saveState, editId, viewId, retry } = useProgram(initial)
  const exercises = useMemo(() => allExercises(program), [program])
  const targets = useMemo(
    () => getTargets(program.focus, program.experience, program.goal),
    [program.focus, program.experience, program.goal],
  )
  const volume = useMemo(() => getWeeklyVolume(program, exercises), [program, exercises])
  const coverage = useMemo(
    () => getCoverage(volume, targets, program.goal),
    [volume, targets, program.goal],
  )
  const warnings = useMemo(() => getRecoveryWarnings(program, exercises), [program, exercises])
  const warningsByDay = useMemo(() => {
    const m = new Map<number, RecoveryWarning[]>()
    for (const w of warnings) m.set(w.dayB, [...(m.get(w.dayB) ?? []), w])
    return m
  }, [warnings])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        program={program}
        readOnly={readOnly}
        saveState={saveState}
        editId={editId}
        viewId={viewId}
        retry={retry}
        onCopyProgram={onCopyProgram}
        onChangeName={(name) => setProgram((p) => ({ ...p, name }))}
        onChangeDescription={(description) => setProgram((p) => ({ ...p, description }))}
      />
      <SetupBar program={program} readOnly={readOnly} onChange={setProgram} />
      <div className="flex flex-1 gap-4 p-4 max-lg:flex-col">
        <div className="min-w-0 lg:w-2/3">
          <Planner
            program={program}
            readOnly={readOnly}
            exercises={exercises}
            warningsByDay={warningsByDay}
            onChange={setProgram}
          />
        </div>
        <aside className="lg:sticky lg:top-4 lg:w-1/3 lg:self-start max-lg:hidden">
          <Analytics coverage={coverage} warnings={warnings} />
        </aside>
      </div>
      <div className="h-12 lg:hidden" aria-hidden />
      <AnalyticsSheet coverage={coverage} warnings={warnings} />
    </div>
  )
}
