import type { ParsedGroup } from '../lib/ai'
import type { Group } from '../lib/types'
import { addExpense } from './expenses'
import { createGroup } from './groups'

const key = (name: string) => name.trim().toLowerCase()

/**
 * Saves AI-parsed groups: reuses an existing group with the same name, otherwise creates it.
 * Groups are created before their expenses (not in one batch) because the expense rule checks
 * `exists()` on the group, which does not see writes pending in the same batch.
 */
export async function importGroups(uid: string, groups: ParsedGroup[], existing: Group[]) {
  const ids = new Map(existing.map((g) => [key(g.name), g.id]))
  let count = 0
  for (const g of groups) {
    let id = ids.get(key(g.name))
    if (!id) {
      id = await createGroup(uid, g.name)
      ids.set(key(g.name), id)
    }
    const groupId = id
    await Promise.all(g.expenses.map((e) => addExpense(uid, groupId, e)))
    count += g.expenses.length
  }
  return count
}
