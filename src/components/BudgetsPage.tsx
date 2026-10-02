import { useEffect, useState } from 'react'
import { subscribeGroups } from '../data/groups'
import type { Group } from '../lib/types'
import ExpensePanel from './ExpensePanel'
import GroupList from './GroupList'

const SELECTED_KEY = 'selectedGroupId'

export default function BudgetsPage({ uid }: { uid: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(SELECTED_KEY))

  useEffect(() => subscribeGroups(uid, setGroups, (e) => setError(e.message)), [uid])

  // Keep the selection valid as groups are added/removed.
  useEffect(() => {
    if (!groups) return
    if (!selectedId || !groups.some((g) => g.id === selectedId)) {
      setSelectedId(groups[0]?.id ?? null)
    }
  }, [groups, selectedId])

  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId)
  }, [selectedId])

  const selected = groups?.find((g) => g.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <GroupList uid={uid} groups={groups} selectedId={selectedId} onSelect={setSelectedId} />
      <section className="min-w-0 flex-1">
        {groups === null ? null : selected ? (
          <ExpensePanel key={selected.id} uid={uid} group={selected} />
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            Create your first group (e.g. “Jan 2026”, “Marriage plan”, “Roomies”) to start adding expenses.
          </div>
        )}
      </section>
    </div>
  )
}
