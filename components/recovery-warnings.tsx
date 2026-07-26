'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { RecoveryWarning } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { DAY_NAMES } from '@/components/planner'

export function RecoveryWarnings({ warnings }: { warnings: RecoveryWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        No recovery conflicts
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {warnings.map((w) => (
        <div
          key={w.id}
          className={cn(
            'rounded-md border p-2 text-sm',
            w.severity === 'critical'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {w.muscle} trained {DAY_NAMES[w.dayA]} and {DAY_NAMES[w.dayB]}
          </div>
          <p className="mt-0.5 pl-6 text-xs opacity-90">
            {w.suggestion !== null
              ? `e.g. move ${DAY_NAMES[w.dayB]}'s ${w.muscle} work to ${DAY_NAMES[w.suggestion]}`
              : 'no free day gives 48 h spacing'}
          </p>
        </div>
      ))}
    </div>
  )
}
