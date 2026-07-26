'use client'

import { Flame } from 'lucide-react'
import type { CoverageRow, MuscleGroup } from '@/lib/engine'
import { GROUPS } from '@/lib/engine'
import { cn } from '@/lib/utils'

function StatusPill({ status }: { status: CoverageRow['status'] }) {
  const styles: Record<CoverageRow['status'], [string, string]> = {
    none: ['untrained', 'bg-muted text-muted-foreground'],
    low: ['low', 'bg-amber-500/15 text-amber-600 dark:text-amber-400'],
    ideal: ['ideal', 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'],
    high: ['high', 'bg-destructive/15 text-destructive'],
  }
  const [label, cls] = styles[status]
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      {label}
    </span>
  )
}

export function CoverageTable({ coverage }: { coverage: CoverageRow[] }) {
  const byGroup = new Map<MuscleGroup, CoverageRow[]>()
  for (const row of coverage) byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row])

  return (
    <div className="flex flex-col">
      {GROUPS.map((group) => {
        const rows = byGroup.get(group) ?? []
        const total = rows.reduce((s, r) => s + r.sets, 0)
        return (
          <div key={group} className="border-b py-1.5 last:border-b-0">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{total} sets</span>
            </div>
            {rows.map((r) => (
              <div key={r.muscle} className="flex items-center gap-2 px-1 py-0.5 text-sm">
                <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                  {r.muscle}
                  {r.focused && <Flame aria-label="Focus muscle" className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {r.sets} / {r.target.min}–{r.target.max}
                </span>
                <span className="w-16 text-right">
                  <StatusPill status={r.status} />
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
