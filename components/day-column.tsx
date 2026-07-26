'use client'

import { useState } from 'react'
import type { Day, DayExercise, Exercise, RecoveryWarning } from '@/lib/engine'
import { normalizeSupersets } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AddExercise } from '@/components/add-exercise'
import { ExerciseCard } from '@/components/exercise-card'

export function DayColumn({
  dayIndex,
  dayName,
  day,
  readOnly,
  exercises,
  warnings = [],
  onChangeDay,
  onCreateCustom,
  selectedKeys,
  onToggleSelect,
  renderList,
}: {
  dayIndex: number
  dayName: string
  day: Day
  readOnly: boolean
  exercises: Exercise[]
  warnings?: RecoveryWarning[]
  onChangeDay: (next: Day) => void
  onCreateCustom: () => void
  selectedKeys?: Set<string>
  onToggleSelect?: (key: string) => void
  /** Task 12 injects the sortable list here; default renders plain cards. */
  renderList?: (cards: React.ReactNode[]) => React.ReactNode
}) {
  const [confirmingRest, setConfirmingRest] = useState(false)

  const setDay = (next: Day) => onChangeDay(normalizeSupersets(next))

  const updateEntry = (index: number, next: DayExercise) => {
    const list = [...day.exercises]
    list[index] = next
    setDay({ ...day, exercises: list })
  }

  const removeEntry = (index: number) => {
    setDay({ ...day, exercises: day.exercises.filter((_, i) => i !== index) })
  }

  const toggleType = () => {
    if (day.type === 'rest') {
      setDay({ type: 'work', exercises: [] })
      return
    }
    if (day.exercises.length > 0 && !confirmingRest) {
      setConfirmingRest(true)
      setTimeout(() => setConfirmingRest(false), 3000)
      return
    }
    setConfirmingRest(false)
    setDay({ type: 'rest', exercises: [] })
  }

  const cards = day.exercises.map((entry, index) => {
    const key = `${dayIndex}:${index}`
    return (
      <ExerciseCard
        key={key}
        entry={entry}
        readOnly={readOnly}
        onUpdate={(next) => updateEntry(index, next)}
        onRemove={() => removeEntry(index)}
        selected={selectedKeys?.has(key)}
        onToggleSelect={onToggleSelect ? () => onToggleSelect(key) : undefined}
      />
    )
  })

  return (
    <div
      className={cn(
        'flex min-h-48 flex-col gap-2 rounded-lg border p-2',
        day.type === 'rest' && 'bg-muted/40',
        warnings.some((w) => w.severity === 'critical') && 'border-destructive/60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-semibold">{dayName}</span>
        {readOnly ? (
          <span className="text-xs text-muted-foreground">{day.type === 'rest' ? 'Rest' : 'Work'}</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-6 px-2 text-xs', confirmingRest && 'text-destructive')}
            onClick={toggleType}
          >
            {day.type === 'rest' ? 'Rest day' : confirmingRest ? 'Clear day?' : 'Work day'}
          </Button>
        )}
      </div>

      {day.type === 'rest' ? (
        <div className="grid flex-1 place-items-center text-xs text-muted-foreground">Rest</div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-2">
            {renderList ? renderList(cards) : cards}
          </div>
          {!readOnly && (
            <AddExercise
              exercises={exercises}
              onCreateCustom={onCreateCustom}
              onAdd={(ex) =>
                setDay({
                  ...day,
                  exercises: [
                    ...day.exercises,
                    { exerciseId: ex.id, name: ex.name, sets: 3, reps: '8-12' },
                  ],
                })
              }
            />
          )}
        </>
      )}
    </div>
  )
}
