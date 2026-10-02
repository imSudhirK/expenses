import type { Timestamp } from 'firebase/firestore'

export const EXPENSE_TYPES = ['personal', 'education', 'investment', 'others'] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

export interface Group {
  id: string
  name: string
  createdAt: Timestamp | null
}

export interface Expense {
  id: string
  title: string
  amount: number
  paidAmount: number
  groupId: string
  type: ExpenseType
  dueDate: Timestamp | null
  createdAt: Timestamp | null
}

/** Fields the user edits in the form. */
export interface ExpenseInput {
  title: string
  amount: number
  paidAmount: number
  type: ExpenseType
  dueDate: Date | null
}

export const remaining = (e: Pick<Expense, 'amount' | 'paidAmount'>) => e.amount - e.paidAmount
