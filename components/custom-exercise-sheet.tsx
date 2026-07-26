'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Exercise, Muscle } from '@/lib/engine'
import { MUSCLES } from '@/lib/engine'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

function MuscleMultiSelect({
  label,
  selected,
  onChange,
}: {
  label: string
  selected: Muscle[]
  onChange: (next: Muscle[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1">
        {selected.map((m) => (
          <Badge key={m} variant="secondary" className="gap-1">
            {m}
            <button aria-label={`Remove ${m}`} onClick={() => onChange(selected.filter((x) => x !== m))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs">
              + Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <Command>
              <CommandInput placeholder="Search muscles…" />
              <CommandList>
                <CommandEmpty>No match.</CommandEmpty>
                <CommandGroup>
                  {MUSCLES.filter((m) => !selected.includes(m)).map((m) => (
                    <CommandItem
                      key={m}
                      onSelect={() => {
                        onChange([...selected, m])
                        setOpen(false)
                      }}
                    >
                      {m}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export function CustomExerciseSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (exercise: Exercise) => void
}) {
  const [name, setName] = useState('')
  const [equipment, setEquipment] = useState('')
  const [primary, setPrimary] = useState<Muscle[]>([])
  const [secondary, setSecondary] = useState<Muscle[]>([])
  const [type, setType] = useState<'compound' | 'isolation'>('compound')

  const reset = () => {
    setName('')
    setEquipment('')
    setPrimary([])
    setSecondary([])
    setType('compound')
  }

  const create = () => {
    onCreate({
      id: 'custom-' + crypto.randomUUID().slice(0, 8),
      name: name.trim(),
      equipment: equipment.trim() || 'Other',
      primaryMuscles: primary,
      secondaryMuscles: secondary,
      type,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create custom exercise</SheetTitle>
          <SheetDescription>Only canonical muscles can be targeted.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-name">Name</Label>
            <Input id="custom-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-equipment">Equipment</Label>
            <Input id="custom-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          </div>
          <MuscleMultiSelect label="Primary muscles" selected={primary} onChange={setPrimary} />
          <MuscleMultiSelect label="Secondary muscles" selected={secondary} onChange={setSecondary} />
          <div className="space-y-1.5">
            <Label>Type</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(v) => v && setType(v as 'compound' | 'isolation')}
            >
              <ToggleGroupItem value="compound">Compound</ToggleGroupItem>
              <ToggleGroupItem value="isolation">Isolation</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button className="w-full" disabled={!name.trim() || primary.length === 0} onClick={create}>
            Create exercise
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
