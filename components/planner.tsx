'use client'

import { useState } from 'react'
import type { Day, Exercise, Program, RecoveryWarning } from '@/lib/engine'
import { normalizeSupersets } from '@/lib/engine'
import { DayColumn } from '@/components/day-column'
import { CustomExerciseSheet } from '@/components/custom-exercise-sheet'

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Planner({
  program,
  readOnly,
  exercises,
  warningsByDay,
  onChange,
}: {
  program: Program
  readOnly: boolean
  exercises: Exercise[]
  warningsByDay: Map<number, RecoveryWarning[]>
  onChange: (update: (p: Program) => Program) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)

  const setDay = (dayIndex: number, next: Day) =>
    onChange((p) => {
      const days = [...p.days] as Program['days']
      days[dayIndex] = normalizeSupersets(next)
      return { ...p, days }
    })

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1100px] grid-cols-7 gap-2">
        {program.days.map((day, i) => (
          <DayColumn
            key={i}
            dayIndex={i}
            dayName={DAY_NAMES[i]}
            day={day}
            readOnly={readOnly}
            exercises={exercises}
            warnings={warningsByDay.get(i) ?? []}
            onChangeDay={(next) => setDay(i, next)}
            onCreateCustom={() => setCustomOpen(true)}
          />
        ))}
      </div>
      <CustomExerciseSheet
        open={customOpen}
        onOpenChange={setCustomOpen}
        onCreate={(ex) => onChange((p) => ({ ...p, customExercises: [...p.customExercises, ex] }))}
      />
    </div>
  )
}
