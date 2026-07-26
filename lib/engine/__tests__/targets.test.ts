import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../taxonomy'
import { BASE_IDEAL, getFocusedMuscles, getTargets } from '../targets'

const balanced = { mode: 'balanced' } as const

describe('BASE_IDEAL', () => {
  it('spot-checks the hypertrophy table', () => {
    expect(BASE_IDEAL.Hypertrophy.beginner.Chest).toBe(12)
    expect(BASE_IDEAL.Hypertrophy.intermediate.Lats).toBe(12)
    expect(BASE_IDEAL.Hypertrophy.advanced.Quads).toBe(20)
    expect(BASE_IDEAL.Hypertrophy.beginner.Obliques).toBe(2)
    expect(BASE_IDEAL.Hypertrophy.advanced.Core).toBe(14)
  })

  it('derives Strength as round(0.75 · hypertrophy)', () => {
    for (const exp of ['beginner', 'intermediate', 'advanced'] as const) {
      for (const m of MUSCLES) {
        expect(BASE_IDEAL.Strength[exp][m]).toBe(Math.round(0.75 * BASE_IDEAL.Hypertrophy[exp][m]))
      }
    }
  })
})

describe('getTargets — balanced', () => {
  it('min = ceil(0.75·ideal), max = floor(1.25·ideal)', () => {
    const t = getTargets('Hypertrophy', 'intermediate', balanced)
    expect(t.Chest).toEqual({ min: 12, ideal: 16, max: 20 })
    expect(t.Forearms).toEqual({ min: 3, ideal: 4, max: 5 })
    expect(MUSCLES.every((m) => t[m].min <= t[m].ideal && t[m].ideal <= t[m].max)).toBe(true)
  })
})

describe('getTargets — focused', () => {
  const goal = { mode: 'focused', targets: [{ kind: 'muscle', muscle: 'Chest' }] } as const

  it('boosts the focused muscle 1.5x with MRV cap and old ideal as floor', () => {
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    // ideal 16 → round(1.5·16)=24, cap floor(1.25·20)=25 → idealF 24
    expect(t.Chest).toEqual({ min: 16, ideal: 24, max: 30 })
  })

  it('applies the MRV cap when 1.5x exceeds 1.25·advanced ideal', () => {
    const t = getTargets('Hypertrophy', 'advanced', goal)
    // ideal 20 → round(1.5·20)=30, cap floor(1.25·20)=25 → idealF 25, max floor(1.25·25)=31
    expect(t.Chest).toEqual({ min: 20, ideal: 25, max: 31 })
  })

  it('puts non-focused muscles on maintenance', () => {
    const t = getTargets('Hypertrophy', 'intermediate', goal)
    // Lats ideal 12 → idealM max(round(4.8),2)=5, min max(3,1)=3, max 12
    expect(t.Lats).toEqual({ min: 3, ideal: 5, max: 12 })
    // Obliques ideal 4 → idealM max(round(1.6),2)=2, min max(1,1)=1, max 4
    expect(t.Obliques).toEqual({ min: 1, ideal: 2, max: 4 })
  })

  it('expands a group target to its member muscles', () => {
    const g = { mode: 'focused', targets: [{ kind: 'group', group: 'Arms' }] } as const
    const focused = getFocusedMuscles(g)
    expect(focused).toEqual(new Set(['Biceps', 'Triceps', 'Forearms']))
    const t = getTargets('Hypertrophy', 'intermediate', g)
    expect(t.Biceps.min).toBe(12) // boosted: floor is the old ideal
    expect(t.Chest.max).toBe(16) // maintenance: capped at old ideal
  })

  it('throws on more than 2 targets (and on zero)', () => {
    const three = {
      mode: 'focused',
      targets: [
        { kind: 'muscle', muscle: 'Chest' },
        { kind: 'muscle', muscle: 'Lats' },
        { kind: 'muscle', muscle: 'Quads' },
      ],
    } as const
    expect(() => getTargets('Hypertrophy', 'beginner', three)).toThrow()
    expect(() => getTargets('Hypertrophy', 'beginner', { mode: 'focused', targets: [] })).toThrow()
  })
})
