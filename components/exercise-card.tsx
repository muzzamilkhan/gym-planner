'use client'

import { Minus, Plus, X } from 'lucide-react'
import type { DayExercise } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ExerciseCard({
  entry,
  readOnly,
  onUpdate,
  onRemove,
  selected,
  onToggleSelect,
  dragHandle,
}: {
  entry: DayExercise
  readOnly: boolean
  onUpdate: (next: DayExercise) => void
  onRemove: () => void
  selected?: boolean
  onToggleSelect?: () => void
  dragHandle?: React.ReactNode
}) {
  const setSets = (delta: number) => {
    const sets = Math.min(10, Math.max(1, entry.sets + delta))
    if (sets !== entry.sets) onUpdate({ ...entry, sets })
  }

  return (
    <div
      className={cn(
        'group rounded-md border bg-card p-2 text-card-foreground shadow-sm',
        selected && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-1">
        {dragHandle}
        {!readOnly && onToggleSelect && (
          <input
            type="checkbox"
            aria-label={`Select ${entry.name}`}
            className="mt-1 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 checked:opacity-100"
            checked={!!selected}
            onChange={onToggleSelect}
          />
        )}
        <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5">{entry.name}</span>
        {!readOnly && (
          <button
            aria-label={`Remove ${entry.name}`}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-sm">
        {readOnly ? (
          <span className="text-muted-foreground">
            {entry.sets} × {entry.reps || '—'}
          </span>
        ) : (
          <>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setSets(-1)} aria-label="Fewer sets">
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-5 text-center tabular-nums">{entry.sets}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setSets(1)} aria-label="More sets">
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-muted-foreground">×</span>
            <Input
              aria-label="Reps"
              className="h-6 w-16 px-1 text-sm"
              value={entry.reps}
              onChange={(e) => onUpdate({ ...entry, reps: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  )
}
