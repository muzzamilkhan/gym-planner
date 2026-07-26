'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { DAY_NAMES_SHORT } from '@/components/planner'

export function MobileDayPager({ renderDay }: { renderDay: (dayIndex: number) => React.ReactNode }) {
  // Open on the current weekday, Monday-indexed.
  const [active, setActive] = useState(() => (new Date().getDay() + 6) % 7)
  const touchStartX = useRef<number | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES_SHORT.map((name, i) => (
          <button
            key={name}
            className={cn(
              'rounded-md py-1.5 text-xs font-medium',
              i === active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
            onClick={() => setActive(i)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (Math.abs(dx) < 48) return
          setActive((a) => Math.min(6, Math.max(0, a + (dx < 0 ? 1 : -1))))
        }}
      >
        {renderDay(active)}
      </div>
    </div>
  )
}
