import { remaining, type Expense } from './types'

export interface PeriodTotals {
  amount: number
  paid: number
  remaining: number
  count: number
}

export interface Summary {
  year: PeriodTotals
  month: PeriodTotals
  week: PeriodTotals
  pendingDues: { remaining: number; overdue: number; count: number }
}

/** The date an expense "belongs" to: its due date, or when it was created if it has none. */
export const periodDate = (e: Expense) => (e.dueDate ?? e.createdAt)?.toDate() ?? null

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** True if the expense still has money owed and its due date is today or earlier. */
export const isDue = (e: Expense, now = new Date()) => {
  if (remaining(e) <= 0 || !e.dueDate) return false
  const tomorrow = startOfDay(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return e.dueDate.toDate() < tomorrow
}

export type RemainingTone = 'due' | 'pending' | 'settled'

export const remainingTone = (e: Expense, now = new Date()): RemainingTone =>
  remaining(e) <= 0 ? 'settled' : isDue(e, now) ? 'due' : 'pending'

const empty = (): PeriodTotals => ({ amount: 0, paid: 0, remaining: 0, count: 0 })

const add = (t: PeriodTotals, e: Expense) => {
  t.amount += e.amount
  t.paid += e.paidAmount
  t.remaining += remaining(e)
  t.count++
}

export function summarize(expenses: Expense[], now = new Date()): Summary {
  const today = startOfDay(now)
  // Week runs Monday–Sunday.
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const s: Summary = { year: empty(), month: empty(), week: empty(), pendingDues: { remaining: 0, overdue: 0, count: 0 } }

  for (const e of expenses) {
    const left = remaining(e)
    if (left > 0) {
      s.pendingDues.remaining += left
      s.pendingDues.count++
      if (isDue(e, now)) s.pendingDues.overdue += left
    }

    const d = periodDate(e)
    if (!d) continue
    // Checked independently of the year: a week can straddle New Year.
    if (d >= weekStart && d < weekEnd) add(s.week, e)
    if (d.getFullYear() !== today.getFullYear()) continue
    add(s.year, e)
    if (d.getMonth() === today.getMonth()) add(s.month, e)
  }
  return s
}
