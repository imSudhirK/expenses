import { useState, type FormEvent } from 'react'
import { formatMoney, fromDateInput, toDateInput } from '../lib/format'
import { EXPENSE_TYPES, type Expense, type ExpenseInput, type ExpenseType } from '../lib/types'
import Modal from './Modal'

interface Props {
  title: string
  initial?: Expense
  onSubmit: (input: ExpenseInput) => Promise<unknown>
  onClose: () => void
}

export default function ExpenseForm({ title, initial, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    amount: initial ? String(initial.amount) : '',
    paidAmount: initial ? String(initial.paidAmount) : '0',
    type: initial?.type ?? ('personal' as ExpenseType),
    dueDate: toDateInput(initial?.dueDate?.toDate() ?? null),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const amount = Number(form.amount)
  const paid = Number(form.paidAmount || 0)
  const validationError =
    !form.title.trim() ? 'Title is required.'
    : !form.amount || !Number.isFinite(amount) || amount < 0 ? 'Enter a valid amount.'
    : !Number.isFinite(paid) || paid < 0 ? 'Enter a valid paid amount.'
    : !Number.isInteger(amount) || !Number.isInteger(paid) ? 'Use whole numbers (no decimals).'
    : paid > amount ? 'Paid amount cannot exceed the expense amount.'
    : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (validationError) return setError(validationError)
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title: form.title,
        amount,
        paidAmount: paid,
        type: form.type,
        dueDate: fromDateInput(form.dueDate),
      })
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="exp-title">Title</label>
          <input id="exp-title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={100} required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exp-amount">Amount</label>
            <input id="exp-amount" className="input" type="number" inputMode="numeric" min="0" step="1" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="exp-paid">Paid</label>
            <input id="exp-paid" className="input" type="number" inputMode="numeric" min="0" step="1" value={form.paidAmount} onChange={(e) => set('paidAmount', e.target.value)} />
          </div>
        </div>

        <p className="text-sm text-slate-500">
          Remaining:{' '}
          <span className="font-medium tabular-nums text-slate-800">
            {Number.isFinite(amount - paid) ? formatMoney(Math.max(amount - paid, 0)) : '—'}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exp-type">Type</label>
            <select id="exp-type" className="input capitalize" value={form.type} onChange={(e) => set('type', e.target.value as ExpenseType)}>
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="exp-due">Due date</label>
            <input id="exp-due" className="input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
