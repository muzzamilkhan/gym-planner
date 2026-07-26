'use client'

import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Day, DayExercise, Exercise, Program, RecoveryWarning } from '@/lib/engine'
import { normalizeSupersets } from '@/lib/engine'
import { DayColumn } from '@/components/day-column'
import { CustomExerciseSheet } from '@/components/custom-exercise-sheet'
import { MobileDayPager } from '@/components/mobile-day-pager'

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type DragRef =
  | { day: number; kind: 'single'; index: number }
  | { day: number; kind: 'group'; supersetId: string }
  | { day: number; kind: 'drop' }

function parseId(id: string): DragRef | null {
  const [dayStr, kind, rest] = id.split(':')
  const day = Number(dayStr)
  if (Number.isNaN(day)) return null
  if (kind === 'i') return { day, kind: 'single', index: Number(rest) }
  if (kind === 'g') return { day, kind: 'group', supersetId: rest }
  if (kind === 'drop') return { day, kind: 'drop' }
  return null
}

/** Remove the dragged entries from a day's list; returns [remaining, moved]. */
function extract(day: Day, ref: DragRef): [DayExercise[], DayExercise[]] {
  if (ref.kind === 'single') {
    const moved = day.exercises[ref.index]
    return [day.exercises.filter((_, i) => i !== ref.index), moved ? [moved] : []]
  }
  if (ref.kind === 'group') {
    return [
      day.exercises.filter((e) => e.supersetId !== ref.supersetId),
      day.exercises.filter((e) => e.supersetId === ref.supersetId),
    ]
  }
  return [day.exercises, []]
}

/** Index in `list` where entries dropped on `over` should be inserted. */
function insertionIndex(list: DayExercise[], over: DragRef): number {
  if (over.kind === 'drop') return list.length
  if (over.kind === 'single') return Math.min(over.index, list.length)
  const first = list.findIndex((e) => e.supersetId === over.supersetId)
  return first === -1 ? list.length : first
}

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
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const setDay = (dayIndex: number, next: Day) =>
    onChange((p) => {
      const days = [...p.days] as Program['days']
      days[dayIndex] = normalizeSupersets(next)
      return { ...p, days }
    })

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const day = key.split(':')[0]
      const next = new Set([...prev].filter((k) => k.split(':')[0] === day))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectionInfo = (() => {
    if (selected.size < 2) return null
    const day = Number([...selected][0].split(':')[0])
    const indices = [...selected].map((k) => Number(k.split(':')[1])).sort((a, b) => a - b)
    const adjacent = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1)
    const free = indices.every((i) => !program.days[day].exercises[i]?.supersetId)
    return adjacent && free ? { day, indices } : null
  })()

  const groupSelection = () => {
    if (!selectionInfo) return
    const supersetId = 'ss-' + crypto.randomUUID().slice(0, 8)
    const day = program.days[selectionInfo.day]
    setDay(selectionInfo.day, {
      ...day,
      exercises: day.exercises.map((e, i) =>
        selectionInfo.indices.includes(i) ? { ...e, supersetId } : e,
      ),
    })
    setSelected(new Set())
  }

  const onDragEnd = (event: DragEndEvent) => {
    const from = parseId(String(event.active.id))
    const over = event.over ? parseId(String(event.over.id)) : null
    if (!from || !over || from.kind === 'drop') return
    onChange((p) => {
      const days = [...p.days] as Program['days']
      const [remaining, moved] = extract(days[from.day], from)
      if (moved.length === 0) return p
      // Moving a loose single across days never carries superset state; groups keep theirs.
      const carried =
        from.kind === 'single' && from.day !== over.day
          ? moved.map((m) => ({ ...m, supersetId: undefined }))
          : moved
      if (from.day === over.day) {
        const at = insertionIndex(remaining, over)
        const list = [...remaining]
        list.splice(at, 0, ...carried)
        days[from.day] = normalizeSupersets({ ...days[from.day], exercises: list })
      } else {
        days[from.day] = normalizeSupersets({ ...days[from.day], exercises: remaining })
        const target = days[over.day]
        const at = insertionIndex(target.exercises, over)
        const list = [...target.exercises]
        list.splice(at, 0, ...carried)
        // Dropping onto a rest day turns it into a work day.
        days[over.day] = normalizeSupersets({ type: 'work', exercises: list })
      }
      return { ...p, days }
    })
    setSelected(new Set())
  }

  const renderDay = (i: number) => (
    <DayColumn
      key={i}
      dayIndex={i}
      dayName={DAY_NAMES[i]}
      day={program.days[i]}
      readOnly={readOnly}
      exercises={exercises}
      warnings={warningsByDay.get(i) ?? []}
      onChangeDay={(next) => setDay(i, next)}
      onCreateCustom={() => setCustomOpen(true)}
      selectedKeys={selected}
      onToggleSelect={readOnly ? undefined : toggleSelect}
      onGroupSelection={groupSelection}
      canGroupSelection={selectionInfo?.day === i}
    />
  )

  return (
    <div className="lg:overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="hidden min-w-[1100px] grid-cols-7 gap-2 lg:grid">
          {program.days.map((_, i) => renderDay(i))}
        </div>
        <div className="lg:hidden">
          <MobileDayPager renderDay={renderDay} />
        </div>
      </DndContext>
      <CustomExerciseSheet
        open={customOpen}
        onOpenChange={setCustomOpen}
        onCreate={(ex) => onChange((p) => ({ ...p, customExercises: [...p.customExercises, ex] }))}
      />
    </div>
  )
}
