'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import type { CoverageRow, RecoveryWarning } from '@/lib/engine'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Analytics } from '@/components/analytics'

export function AnalyticsSheet({
  coverage,
  warnings,
}: {
  coverage: CoverageRow[]
  warnings: RecoveryWarning[]
}) {
  const [open, setOpen] = useState(false)
  const onTarget = coverage.filter((r) => r.status === 'ideal').length

  return (
    <>
      <button
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t bg-background px-4 py-2.5 text-sm lg:hidden"
        onClick={() => setOpen(true)}
      >
        <span>
          {warnings.length} warning{warnings.length === 1 ? '' : 's'} · {onTarget}/{coverage.length}{' '}
          muscles on target
        </span>
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Analytics</SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            <Analytics coverage={coverage} warnings={warnings} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
