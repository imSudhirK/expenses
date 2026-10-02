import { useEffect, useMemo, useState } from 'react'
import { addExpense, deleteExpense, subscribeExpenses, updateExpense } from '../data/expenses'
import { remainingTone, type RemainingTone } from '../lib/analytics'
import { formatDate, formatMoney } from '../lib/format'
import { TYPE_DOT, TYPE_TEXT } from '../lib/typeColors'
import { EXPENSE_TYPES, remaining, type Expense, type Group } from '../lib/types'
import ConfirmDialog from './ConfirmDialog'
import ExpenseForm from './ExpenseForm'
import StatCard from './StatCard'

type Dialog = { kind: 'add' } | { kind: 'edit'; expense: Expense } | { kind: 'delete'; expense: Expense } | null

export default function ExpensePanel({ uid, group }: { uid: string; group: Group }) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  useEffect(
    () => subscribeExpenses(uid, group.id, setExpenses, (e) => setError(e.message)),
    [uid, group.id],
  )

  const totals = useMemo(() => {
    const t = { amount: 0, paid: 0 }
    for (const e of expenses ?? []) {
      t.amount += e.amount
      t.paid += e.paidAmount
    }
    return { ...t, remaining: t.amount - t.paid }
  }, [expenses])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="truncate text-xl font-semibold">{group.name}</h2>
        <button className="btn-primary shrink-0" onClick={() => setDialog({ kind: 'add' })}>
          + Add expense
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total" value={totals.amount} />
        <StatCard label="Paid" value={totals.paid} tone="text-emerald-600" />
        <StatCard label="Remaining" value={totals.remaining} tone={totals.remaining > 0 ? 'text-amber-600' : undefined} />
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {expenses === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          No expenses in this group yet.
        </div>
      ) : (
        <>
          <TypeLegend />

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Expenses</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Remaining</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className={`px-4 py-3 font-medium ${TYPE_TEXT[e.type]}`}>{e.title}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Remaining expense={e} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <RowActions onEdit={() => setDialog({ kind: 'edit', expense: e })} onDelete={() => setDialog({ kind: 'delete', expense: e })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${TYPE_TEXT[e.type]}`}>{e.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <span className="tabular-nums text-slate-600">{formatMoney(e.amount)}</span>
                    <Remaining expense={e} />
                  </p>
                </div>
                <RowActions onEdit={() => setDialog({ kind: 'edit', expense: e })} onDelete={() => setDialog({ kind: 'delete', expense: e })} />
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.kind === 'add' && (
        <ExpenseForm title="Add expense" onClose={close} onSubmit={(input) => addExpense(uid, group.id, input)} />
      )}
      {dialog?.kind === 'edit' && (
        <ExpenseForm
          title="Edit expense"
          initial={dialog.expense}
          onClose={close}
          onSubmit={(input) => updateExpense(uid, dialog.expense.id, input)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete expense?"
          message={`“${dialog.expense.title}” will be permanently deleted.`}
          onConfirm={() => deleteExpense(uid, dialog.expense.id)}
          onClose={close}
        />
      )}
    </div>
  )
}

function TypeLegend() {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {EXPENSE_TYPES.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 capitalize">
          <span className={`h-2 w-2 rounded-full ${TYPE_DOT[t]}`} />
          {t}
        </span>
      ))}
    </div>
  )
}

const TONE_STYLES: Record<RemainingTone, string> = {
  due: 'rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700',
  pending: 'rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-800',
  settled: 'text-slate-500',
}

function Remaining({ expense }: { expense: Expense }) {
  const tone = remainingTone(expense)
  const due = expense.dueDate ? `Due ${formatDate(expense.dueDate.toDate())}` : 'No due date'
  return (
    <span title={tone === 'settled' ? 'Fully paid' : due} className={`inline-block tabular-nums ${TONE_STYLES[tone]}`}>
      {formatMoney(remaining(expense))}
    </span>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="inline-flex shrink-0 gap-0.5">
      <button aria-label="Edit expense" title="Edit expense" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={onEdit}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button aria-label="Delete expense" title="Delete expense" className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </span>
  )
}
