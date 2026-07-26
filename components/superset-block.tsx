'use client'

import { Button } from '@/components/ui/button'

export function SupersetBlock({
  readOnly,
  onUngroup,
  children,
}: {
  readOnly: boolean
  onUngroup: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border-l-2 border-primary bg-primary/5 p-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Superset</span>
        {!readOnly && (
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={onUngroup}>
            Ungroup
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}
