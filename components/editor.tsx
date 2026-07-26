'use client'

import { useMemo, useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  const [analyticsOpen, setAnalyticsOpen] = useState(true)
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
        <div className={cn('min-w-0', analyticsOpen ? 'lg:w-2/3' : 'lg:flex-1')}>
          <Planner
            program={program}
            readOnly={readOnly}
            exercises={exercises}
            warningsByDay={warningsByDay}
            onChange={setProgram}
          />
        </div>
        <aside
          className={cn(
            'lg:sticky lg:top-4 lg:self-start max-lg:hidden',
            analyticsOpen ? 'lg:w-1/3' : 'lg:w-auto',
          )}
        >
          <div className={cn('flex items-center', analyticsOpen ? 'justify-end' : 'justify-center')}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              aria-expanded={analyticsOpen}
              onClick={() => setAnalyticsOpen((v) => !v)}
            >
              {analyticsOpen ? (
                <>
                  <PanelRightClose className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
              <span className="sr-only">{analyticsOpen ? 'Hide analytics' : 'Show analytics'}</span>
            </Button>
          </div>
          {analyticsOpen && (
            <div className="mt-2">
              <Analytics coverage={coverage} warnings={warnings} />
            </div>
          )}
        </aside>
      </div>
      <div className="h-12 lg:hidden" aria-hidden />
      <AnalyticsSheet coverage={coverage} warnings={warnings} />
    </div>
  )
}
