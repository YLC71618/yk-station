// Every tunable game number lives here (SPEC §5). Change a value, rebuild, done.

export const TIME_ZONE = 'Europe/London'

export const coins = {
  waterCupApproved: 5,
  choreOnTime: 5,
  handScorePlus: 2,
  perfectStreak: 30,
  perfectStreakDays: 7,
  cookedWish: 10,
  shoppingListCleared: 5,
} as const

export const water = {
  dailyGoalYoyo: 8,
  requestRepingMinutes: 30,
  snoozeMinutes: 30,
  maxSnoozesPerDay: 2,
  photoMaxPx: 1080,
  photoJpegQuality: 0.7,
  photoRetentionDays: 14,
  selfReminderHours: [10, 13, 16, 19],
  /** "Behind pace" = fewer cups than the goal spread evenly over these waking hours. */
  paceStartHour: 8,
  paceEndHour: 22,
} as const

export const chores = {
  shaveIntervalDays: 3,
  nailsIntervalDays: 9,
  reminderHour: 9,
} as const

export const bear = {
  statMin: 5,
  statMax: 100,
  water: { approvedCup: 10, missedGoal: -20 },
  clean: { handPlus: 5, handMinus: -10, overduePerDay: -10, crackedPawsBelow: 40 },
  mood: { perIllDay: -5, treatment: 15 },
  energy: { cooked: 10, idleDay: -10 },
  escalation: { moderateAfterDays: 2, severeAfterDays: 4 },
} as const

export type Severity = 'mild' | 'moderate' | 'severe'
export type TreatmentKind = 'medicine' | 'injection' | 'hospital'

export const treatments: Record<
  TreatmentKind,
  { cost: number; cures: readonly Severity[]; statBoost: number; waitHours: number }
> = {
  medicine: { cost: 30, cures: ['mild'], statBoost: 30, waitHours: 0 },
  injection: { cost: 80, cures: ['mild', 'moderate'], statBoost: 50, waitHours: 0 },
  hospital: { cost: 200, cures: ['mild', 'moderate', 'severe'], statBoost: 65, waitHours: 2 },
}
