'use client'

import type { CoverageRow, RecoveryWarning } from '@/lib/engine'
import { CoverageTable } from '@/components/coverage-table'
import { RecoveryWarnings } from '@/components/recovery-warnings'

export function Analytics({
  coverage,
  warnings,
}: {
  coverage: CoverageRow[]
  warnings: RecoveryWarning[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <RecoveryWarnings warnings={warnings} />
      <CoverageTable coverage={coverage} />
    </div>
  )
}
