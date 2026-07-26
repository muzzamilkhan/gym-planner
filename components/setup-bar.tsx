'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { FocusTarget, Program } from '@/lib/engine'
import { GROUPS, MUSCLES } from '@/lib/engine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

function targetKey(t: FocusTarget) {
  return t.kind === 'muscle' ? `m:${t.muscle}` : `g:${t.group}`
}

function targetLabel(t: FocusTarget) {
  return t.kind === 'muscle' ? t.muscle : `${t.group} (group)`
}

export function SetupBar({
  program,
  readOnly,
  onChange,
}: {
  program: Program
  readOnly: boolean
  onChange: (update: (p: Program) => Program) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const goal = program.goal
  const targets = goal.mode === 'focused' ? goal.targets : []
  const full = targets.length >= 2

  const addTarget = (t: FocusTarget) => {
    onChange((p) => {
      if (p.goal.mode !== 'focused') return p
      if (p.goal.targets.length >= 2) return p
      if (p.goal.targets.some((x) => targetKey(x) === targetKey(t))) return p
      return { ...p, goal: { mode: 'focused', targets: [...p.goal.targets, t] } }
    })
    setPickerOpen(false)
  }

  const removeTarget = (t: FocusTarget) => {
    onChange((p) => {
      if (p.goal.mode !== 'focused') return p
      const rest = p.goal.targets.filter((x) => targetKey(x) !== targetKey(t))
      // getTargets requires 1-2 targets; keep at least one by falling back to balanced
      if (rest.length === 0) return { ...p, goal: { mode: 'balanced' } }
      return { ...p, goal: { mode: 'focused', targets: rest } }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
      <ToggleGroup
        type="single"
        value={program.focus}
        disabled={readOnly}
        onValueChange={(v) => v && onChange((p) => ({ ...p, focus: v as Program['focus'] }))}
      >
        <ToggleGroupItem value="Hypertrophy">Hypertrophy</ToggleGroupItem>
        <ToggleGroupItem value="Strength">Strength</ToggleGroupItem>
      </ToggleGroup>

      <Select
        value={program.experience}
        disabled={readOnly}
        onValueChange={(v) => onChange((p) => ({ ...p, experience: v as Program['experience'] }))}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>

      <ToggleGroup
        type="single"
        value={goal.mode}
        disabled={readOnly}
        onValueChange={(v) => {
          if (!v) return
          onChange((p) => ({
            ...p,
            goal:
              v === 'balanced'
                ? { mode: 'balanced' }
                : { mode: 'focused', targets: [{ kind: 'group', group: 'Chest' }] },
          }))
        }}
      >
        <ToggleGroupItem value="balanced">Balanced</ToggleGroupItem>
        <ToggleGroupItem value="focused">Focused</ToggleGroupItem>
      </ToggleGroup>

      {goal.mode === 'focused' && (
        <div className="flex flex-wrap items-center gap-2">
          {targets.map((t) => (
            <Badge key={targetKey(t)} variant="secondary" className="gap-1">
              {targetLabel(t)}
              {!readOnly && (
                <button aria-label={`Remove ${targetLabel(t)}`} onClick={() => removeTarget(t)}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {!readOnly && !full && (
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1">
                  <Plus className="h-3 w-3" /> Add focus
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0">
                <Command>
                  <CommandInput placeholder="Search muscle or group…" />
                  <CommandList>
                    <CommandEmpty>No match.</CommandEmpty>
                    <CommandGroup heading="Muscle groups">
                      {GROUPS.map((g) => (
                        <CommandItem key={g} onSelect={() => addTarget({ kind: 'group', group: g })}>
                          {g}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Muscles">
                      {MUSCLES.map((m) => (
                        <CommandItem key={m} onSelect={() => addTarget({ kind: 'muscle', muscle: m })}>
                          {m}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  )
}
