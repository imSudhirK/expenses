// Run with: npm run test:rules   (starts the Firestore emulator; needs Java 21+)
import { readFileSync } from 'node:fs'
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const ALICE = { uid: 'alice', email: 'alice@example.com' }
const BOB = { uid: 'bob', email: 'bob@example.com' }
const MALLORY = { uid: 'mallory', email: 'mallory@example.com' } // not on allowlist

const as = (u: { uid: string; email: string }) =>
  env.authenticatedContext(u.uid, { email: u.email, email_verified: true }).firestore()

const group = () => ({ name: 'Jan 2026', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
const expense = (overrides: Record<string, unknown> = {}) => ({
  title: 'Rent',
  amount: 1000,
  paidAmount: 400,
  groupId: 'g1',
  type: 'personal',
  dueDate: Timestamp.fromDate(new Date('2026-01-31')),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-expense-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'allowlist', ALICE.email), {})
    await setDoc(doc(db, 'allowlist', BOB.email), {})
    await setDoc(doc(db, 'users/alice/groups/g1'), { name: 'Jan 2026', createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
    await setDoc(doc(db, 'users/alice/expenses/e1'), { ...expense(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
  })
})

describe('ownership', () => {
  it('owner can read and write own data', async () => {
    const db = as(ALICE)
    await assertSucceeds(getDoc(doc(db, 'users/alice/expenses/e1')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/groups/g2'), group()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/expenses/e2'), expense()))
  })

  it('other users cannot read or write it', async () => {
    const db = as(BOB)
    await assertFails(getDoc(doc(db, 'users/alice/expenses/e1')))
    await assertFails(setDoc(doc(db, 'users/alice/expenses/e2'), expense()))
    await assertFails(setDoc(doc(db, 'users/alice/groups/g2'), group()))
  })

  it('unauthenticated users are denied', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice/expenses/e1')))
  })

  it('users not on the allowlist are denied even for their own path', async () => {
    const db = as(MALLORY)
    await assertFails(setDoc(doc(db, 'users/mallory/groups/g1'), group()))
  })
})

describe('allowlist', () => {
  it('users can read only their own entry and never write', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'allowlist', ALICE.email)))
    await assertFails(getDoc(doc(as(ALICE), 'allowlist', BOB.email)))
    await assertFails(setDoc(doc(as(MALLORY), 'allowlist', MALLORY.email), {}))
  })
})

describe('expense validation', () => {
  const db = () => as(ALICE)

  it('rejects paidAmount > amount', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ paidAmount: 2000 })))
  })
  it('rejects negative amount', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ amount: -1, paidAmount: 0 })))
  })
  it('rejects unknown type', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ type: 'gambling' })))
  })
  it('rejects empty title', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ title: '' })))
  })
  it('rejects a group that does not exist', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ groupId: 'nope' })))
  })
  it('rejects unexpected fields', async () => {
    await assertFails(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ isAdmin: true })))
  })
  it('allows a null due date', async () => {
    await assertSucceeds(setDoc(doc(db(), 'users/alice/expenses/x'), expense({ dueDate: null })))
  })
  it('allows a partial update but not changing createdAt', async () => {
    await assertSucceeds(updateDoc(doc(db(), 'users/alice/expenses/e1'), { paidAmount: 1000, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db(), 'users/alice/expenses/e1'), { createdAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }))
  })
})
