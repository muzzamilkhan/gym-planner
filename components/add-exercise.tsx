'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Exercise } from '@/lib/engine'
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

export function AddExercise({
  exercises,
  onAdd,
  onCreateCustom,
}: {
  exercises: Exercise[]
  onAdd: (exercise: Exercise) => void
  onCreateCustom: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-1 text-muted-foreground">
          <Plus className="h-4 w-4" /> Add exercise
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder="Search exercises…" />
          <CommandList>
            <CommandEmpty>No exercises found.</CommandEmpty>
            <CommandGroup>
              {exercises.map((ex) => (
                <CommandItem
                  key={ex.id}
                  value={`${ex.name} ${ex.equipment} ${ex.primaryMuscles.join(' ')}`}
                  onSelect={() => {
                    onAdd(ex)
                    setOpen(false)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{ex.equipment}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem
                value="create custom exercise"
                onSelect={() => {
                  setOpen(false)
                  onCreateCustom()
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Create custom exercise
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
