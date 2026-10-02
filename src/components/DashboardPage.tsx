import { useEffect, useMemo, useState } from 'react'
import { subscribeAllExpenses } from '../data/expenses'
import { summarize, type PeriodTotals } from '../lib/analytics'
import { formatMoney } from '../lib/format'
import type { Expense } from '../lib/types'
import StatCard from './StatCard'

const periodSub = (t: PeriodTotals) =>
  t.count === 0 ? 'No expenses' : `Paid ${formatMoney(t.paid)} · Remaining ${formatMoney(t.remaining)}`

export default function DashboardPage({ uid }: { uid: string }) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeAllExpenses(uid, setExpenses, (e) => setError(e.message)), [uid])

  const s = useMemo(() => summarize(expenses ?? []), [expenses])

  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  if (expenses === null) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="This year" value={s.year.amount} sub={periodSub(s.year)} />
        <StatCard label="This month" value={s.month.amount} sub={periodSub(s.month)} />
        <StatCard label="This week" value={s.week.amount} sub={periodSub(s.week)} />
        <StatCard
          label="Pending dues"
          value={s.pendingDues.remaining}
          tone={s.pendingDues.overdue > 0 ? 'text-red-600' : s.pendingDues.remaining > 0 ? 'text-amber-600' : undefined}
          sub={
            s.pendingDues.count === 0
              ? 'All settled'
              : s.pendingDues.overdue > 0
                ? `${formatMoney(s.pendingDues.overdue)} overdue`
                : `${s.pendingDues.count} unpaid, none overdue`
          }
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Expenses count toward the period of their due date (or the date they were added, if no due date). Weeks run
        Monday–Sunday.
      </p>
    </div>
  )
}
