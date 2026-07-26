import { describe, expect, it } from 'vitest'
import { GROUPS, MUSCLES, muscleGroupOf, normalizeMuscle } from '../taxonomy'

describe('taxonomy', () => {
  it('has 22 muscles across 6 groups', () => {
    expect(MUSCLES).toHaveLength(22)
    expect(GROUPS).toEqual(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'])
  })

  it('maps muscles to groups', () => {
    expect(muscleGroupOf('Lats')).toBe('Back')
    expect(muscleGroupOf('Obliques')).toBe('Core')
  })

  it('normalizes aliases and rejects unknowns', () => {
    expect(normalizeMuscle('Chest')).toBe('Chest')
    expect(normalizeMuscle('Brachialis')).toBe('Biceps')
    expect(normalizeMuscle('Hip Flexors')).toBe('Core')
    expect(normalizeMuscle('Upper Back')).toBe('Rhomboids')
    expect(normalizeMuscle('Full Body')).toBeNull()
    expect(normalizeMuscle('Bogus')).toBeNull()
  })
})
