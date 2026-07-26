import type { Day, Program } from '@/lib/engine'

const workDay: Day = { type: 'work', exercises: [] }
const restDay: Day = { type: 'rest', exercises: [] }

export function defaultProgram(): Program {
  return {
    name: 'My Program',
    description: '',
    focus: 'Hypertrophy',
    experience: 'intermediate',
    goal: { mode: 'balanced' },
    days: [
      { ...workDay }, { ...workDay }, { ...restDay }, { ...workDay },
      { ...workDay }, { ...restDay }, { ...restDay },
    ],
    customExercises: [],
  }
}
