export const types = [
  'Income', 'Expense', 'Investment', 'Saving'
] as const

export type TrendType = typeof types[number]

export const categories = [
  'Housing', 'Transport', 'Health', 'Food', 'Education', 'Other'
]