import type { ReactNode } from 'react'
import { formatMoney } from '../lib/format'

interface Props {
  label: string
  value: number
  tone?: string
  sub?: ReactNode
}

export default function StatCard({ label, value, tone, sub }: Props) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-semibold tabular-nums sm:text-lg ${tone ?? ''}`}>{formatMoney(value)}</p>
      {sub && <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
