import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query,
  serverTimestamp, Timestamp, updateDoc, where, type Query, type QuerySnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Expense, ExpenseInput } from '../lib/types'

const expensesCol = (uid: string) => collection(db, 'users', uid, 'expenses')

const toFirestore = (input: ExpenseInput) => ({
  title: input.title.trim(),
  amount: input.amount,
  paidAmount: input.paidAmount,
  type: input.type,
  dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
  updatedAt: serverTimestamp(),
})

const toExpenses = (snap: QuerySnapshot) =>
  snap.docs
    .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as Expense)
    // Newest first, sorted on the client so no composite index is needed.
    .sort((a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity))

const subscribe = (q: Query, onData: (expenses: Expense[]) => void, onError: (e: Error) => void) =>
  onSnapshot(q, (snap) => onData(toExpenses(snap)), onError)

export function subscribeExpenses(
  uid: string,
  groupId: string,
  onData: (expenses: Expense[]) => void,
  onError: (e: Error) => void,
) {
  return subscribe(query(expensesCol(uid), where('groupId', '==', groupId)), onData, onError)
}

/** Every expense across all groups (for dashboard analytics). */
export function subscribeAllExpenses(uid: string, onData: (expenses: Expense[]) => void, onError: (e: Error) => void) {
  return subscribe(query(expensesCol(uid)), onData, onError)
}

export function addExpense(uid: string, groupId: string, input: ExpenseInput) {
  return addDoc(expensesCol(uid), { ...toFirestore(input), groupId, createdAt: serverTimestamp() })
}

export function updateExpense(uid: string, expenseId: string, input: ExpenseInput) {
  return updateDoc(doc(expensesCol(uid), expenseId), toFirestore(input))
}

export function deleteExpense(uid: string, expenseId: string) {
  return deleteDoc(doc(expensesCol(uid), expenseId))
}
