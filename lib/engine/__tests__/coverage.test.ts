import { describe, expect, it } from 'vitest'
import type { Goal, Muscle, MuscleVolume } from '../types'
import { MUSCLES } from '../taxonomy'
import { getTargets } from '../targets'
import { getCoverage } from '../coverage'

const balanced: Goal = { mode: 'balanced' }
const targets = getTargets('Hypertrophy', 'intermediate', balanced) // Chest: 12/16/20

function volumeWith(setsByMuscle: Partial<Record<Muscle, number>>): Record<Muscle, MuscleVolume> {
  const out = {} as Record<Muscle, MuscleVolume>
  for (const m of MUSCLES) out[m] = { sets: setsByMuscle[m] ?? 0, days: setsByMuscle[m] ? [0] : [] }
  return out
}

describe('getCoverage', () => {
  it('returns all 22 muscles with group, in taxonomy order', () => {
    const rows = getCoverage(volumeWith({}), targets, balanced)
    expect(rows.map((r) => r.muscle)).toEqual(MUSCLES)
    expect(rows[0].group).toBe('Chest')
  })

  it('status boundaries: 0 → none, below min → low, at min/max → ideal, above max → high', () => {
    const rows = getCoverage(volumeWith({ Chest: 0, Lats: 8.5, Quads: 12, Biceps: 15, Core: 13 }), targets, balanced)
    const by = Object.fromEntries(rows.map((r) => [r.muscle, r.status]))
    expect(by.Chest).toBe('none')      // 0
    expect(by.Lats).toBe('low')        // 8.5 < min 9
    expect(by.Quads).toBe('ideal')     // 12 = min
    expect(by.Biceps).toBe('ideal')    // 15 = max
    expect(by.Core).toBe('high')       // 13 > max 12
  })

  it('flags focused muscles, including group expansion', () => {
    const goal: Goal = { mode: 'focused', targets: [{ kind: 'group', group: 'Arms' }] }
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    const rows = getCoverage(volumeWith({}), t, goal)
    const focused = rows.filter((r) => r.focused).map((r) => r.muscle)
    expect(focused).toEqual(['Biceps', 'Triceps', 'Forearms'])
  })
})
