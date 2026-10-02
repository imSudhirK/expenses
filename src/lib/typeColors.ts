import type { ExpenseType } from './types'

// Expense type is shown by the colour of the title.
export const TYPE_TEXT: Record<ExpenseType, string> = {
  personal: 'text-sky-700',
  education: 'text-violet-700',
  investment: 'text-emerald-700',
  others: 'text-slate-700',
}
export const TYPE_DOT: Record<ExpenseType, string> = {
  personal: 'bg-sky-600',
  education: 'bg-violet-600',
  investment: 'bg-emerald-600',
  others: 'bg-slate-500',
}
