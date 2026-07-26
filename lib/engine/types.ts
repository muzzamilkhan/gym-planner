export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'

export type Muscle =
  | 'Chest' | 'Upper Chest' | 'Lower Chest'
  | 'Lats' | 'Rhomboids' | 'Mid Traps' | 'Lower Back' | 'Traps'
  | 'Shoulders' | 'Front Delts' | 'Side Delts' | 'Rear Delts'
  | 'Biceps' | 'Triceps' | 'Forearms'
  | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Adductors'
  | 'Core' | 'Obliques'

export type Focus = 'Hypertrophy' | 'Strength'
export type Experience = 'beginner' | 'intermediate' | 'advanced'

export type FocusTarget =
  | { kind: 'muscle'; muscle: Muscle }
  | { kind: 'group'; group: MuscleGroup }

export type Goal =
  | { mode: 'balanced' }
  | { mode: 'focused'; targets: FocusTarget[] }

export type ExerciseType = 'compound' | 'isolation' | 'isometric' | 'olympic' | 'plyometric'

export interface Exercise {
  id: string
  name: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  type: ExerciseType
}

export interface DayExercise {
  exerciseId: string
  name: string
  sets: number
  reps: string
  supersetId?: string
}

export interface Day {
  type: 'work' | 'rest'
  exercises: DayExercise[]
}

export interface Program {
  name: string
  description: string
  focus: Focus
  experience: Experience
  goal: Goal
  days: [Day, Day, Day, Day, Day, Day, Day]
  customExercises: Exercise[]
}

export interface TargetRange { min: number; ideal: number; max: number }

export interface MuscleVolume { sets: number; days: number[] }

export interface CoverageRow {
  muscle: Muscle
  group: MuscleGroup
  sets: number
  target: TargetRange
  status: 'none' | 'low' | 'ideal' | 'high'
  focused: boolean
}

export interface RecoveryWarning {
  id: string
  muscle: Muscle
  dayA: number
  dayB: number
  severity: 'critical' | 'warning'
  suggestion: number | null
}
