'use client'

import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { BedDouble, GripVertical, Link2Off } from 'lucide-react'
import type { Day, DayExercise, Exercise, RecoveryWarning } from '@/lib/engine'
import { normalizeSupersets } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AddExercise } from '@/components/add-exercise'
import { ExerciseCard } from '@/components/exercise-card'
import { SupersetBlock } from '@/components/superset-block'

/** A drag unit: one loose exercise, or one whole superset group. */
export type DayUnit =
  | { kind: 'single'; id: string; index: number }
  | { kind: 'group'; id: string; supersetId: string; indices: number[] }

export function dayUnits(dayIndex: number, day: Day): DayUnit[] {
  const units: DayUnit[] = []
  const seen = new Set<string>()
  day.exercises.forEach((ex, index) => {
    if (!ex.supersetId) {
      units.push({ kind: 'single', id: `${dayIndex}:i:${index}`, index })
    } else if (!seen.has(ex.supersetId)) {
      seen.add(ex.supersetId)
      const indices = day.exercises.flatMap((e, i) => (e.supersetId === ex.supersetId ? [i] : []))
      units.push({ kind: 'group', id: `${dayIndex}:g:${ex.supersetId}`, supersetId: ex.supersetId, indices })
    }
  })
  return units
}

function SortableUnit({
  id,
  disabled,
  children,
}: {
  id: string
  disabled: boolean
  children: (handle: React.ReactNode) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const handle = disabled ? null : (
    <button
      className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 opacity-60')}
    >
      {children(handle)}
    </div>
  )
}

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
  onGroupSelection,
  canGroupSelection,
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
  onGroupSelection?: () => void
  canGroupSelection?: boolean
}) {
  const [confirmingRest, setConfirmingRest] = useState(false)
  const { setNodeRef: setDropRef } = useDroppable({ id: `${dayIndex}:drop`, disabled: readOnly })

  const setDay = (next: Day) => onChangeDay(normalizeSupersets(next))

  const updateEntry = (index: number, next: DayExercise) => {
    const list = [...day.exercises]
    list[index] = next
    setDay({ ...day, exercises: list })
  }

  const removeEntry = (index: number) => {
    setDay({ ...day, exercises: day.exercises.filter((_, i) => i !== index) })
  }

  const ejectFromGroup = (index: number) => {
    updateEntry(index, { ...day.exercises[index], supersetId: undefined })
  }

  const ungroup = (supersetId: string) => {
    setDay({
      ...day,
      exercises: day.exercises.map((e) =>
        e.supersetId === supersetId ? { ...e, supersetId: undefined } : e,
      ),
    })
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

  const card = (index: number, inGroup: boolean) => {
    const entry = day.exercises[index]
    const key = `${dayIndex}:${index}`
    return (
      <div key={key} className="flex items-start gap-0.5">
        <div className="min-w-0 flex-1">
          <ExerciseCard
            entry={entry}
            readOnly={readOnly}
            onUpdate={(next) => updateEntry(index, next)}
            onRemove={() => removeEntry(index)}
            selected={selectedKeys?.has(key)}
            onToggleSelect={!inGroup && onToggleSelect ? () => onToggleSelect(key) : undefined}
          />
        </div>
        {inGroup && !readOnly && (
          <button
            aria-label="Remove from superset"
            title="Remove from superset"
            className="mt-1 text-muted-foreground/60 hover:text-muted-foreground"
            onClick={() => ejectFromGroup(index)}
          >
            <Link2Off className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  const units = dayUnits(dayIndex, day)

  // Rest days collapse to a narrow strip: just a bed icon, no day name, no controls.
  if (day.type === 'rest') {
    const body = (
      <div ref={setDropRef} className="grid flex-1 place-items-center">
        <BedDouble className="h-5 w-5 text-muted-foreground/70" />
      </div>
    )
    return (
      <div
        className="flex min-h-48 flex-col rounded-lg border bg-muted/40 p-2"
        title={`${dayName} — rest day`}
      >
        {readOnly ? (
          body
        ) : (
          <button
            className="grid flex-1 place-items-center rounded-md hover:bg-muted/60"
            aria-label={`${dayName} — rest day, switch to work day`}
            onClick={toggleType}
          >
            <BedDouble className="h-5 w-5 text-muted-foreground/70" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex min-h-48 flex-col gap-2 rounded-lg border p-2',
        warnings.some((w) => w.severity === 'critical') && 'border-destructive/60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-semibold">{dayName}</span>
        {readOnly ? (
          <span className="text-xs text-muted-foreground">Work</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-6 px-2 text-xs', confirmingRest && 'text-destructive')}
            onClick={toggleType}
          >
            {confirmingRest ? 'Clear day?' : 'Work day'}
          </Button>
        )}
      </div>

      {canGroupSelection && (
        <Button size="sm" className="h-7" onClick={onGroupSelection}>
          Group as superset
        </Button>
      )}
      <SortableContext items={units.map((u) => u.id)} strategy={verticalListSortingStrategy}>
        <div ref={setDropRef} className="flex flex-1 flex-col gap-2">
          {units.map((unit) => (
            <SortableUnit key={unit.id} id={unit.id} disabled={readOnly}>
              {(handle) =>
                unit.kind === 'single' ? (
                  <div className="flex items-start gap-0.5">
                    {handle}
                    <div className="min-w-0 flex-1">{card(unit.index, false)}</div>
                  </div>
                ) : (
                  <div className="flex items-start gap-0.5">
                    {handle}
                    <div className="min-w-0 flex-1">
                      <SupersetBlock readOnly={readOnly} onUngroup={() => ungroup(unit.supersetId)}>
                        {unit.indices.map((i) => card(i, true))}
                      </SupersetBlock>
                    </div>
                  </div>
                )
              }
            </SortableUnit>
          ))}
        </div>
      </SortableContext>
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
    </div>
  )
}
