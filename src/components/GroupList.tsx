import { useState } from 'react'
import { createGroup, deleteGroup, renameGroup } from '../data/groups'
import type { Group } from '../lib/types'
import ConfirmDialog from './ConfirmDialog'
import GroupForm from './GroupForm'

interface Props {
  uid: string
  groups: Group[] | null
  selectedId: string | null
  onSelect: (id: string) => void
}

type Dialog = { kind: 'create' } | { kind: 'rename'; group: Group } | { kind: 'delete'; group: Group } | null

export default function GroupList({ uid, groups, selectedId, onSelect }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  return (
    <aside className="md:w-64 md:shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Groups</h2>
        <button className="btn-ghost px-2 py-1 text-indigo-600" onClick={() => setDialog({ kind: 'create' })}>
          + New
        </button>
      </div>

      {groups === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-400">No groups yet.</p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible">
          {groups.map((g) => {
            const active = g.id === selectedId
            return (
              <li key={g.id} className="group/item shrink-0">
                <div
                  className={`flex items-center rounded-lg ${active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50 md:bg-transparent md:ring-0'}`}
                >
                  <button
                    className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm font-medium"
                    onClick={() => onSelect(g.id)}
                  >
                    {g.name}
                  </button>
                  {active && (
                    <div className="flex pr-1">
                      <IconButton label="Rename group" onClick={() => setDialog({ kind: 'rename', group: g })}>
                        ✎
                      </IconButton>
                      <IconButton label="Delete group" onClick={() => setDialog({ kind: 'delete', group: g })}>
                        ✕
                      </IconButton>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {dialog?.kind === 'create' && (
        <GroupForm
          title="New group"
          onClose={close}
          onSubmit={async (name) => onSelect(await createGroup(uid, name))}
        />
      )}
      {dialog?.kind === 'rename' && (
        <GroupForm
          title="Rename group"
          initialName={dialog.group.name}
          onClose={close}
          onSubmit={(name) => renameGroup(uid, dialog.group.id, name)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete group?"
          message={`“${dialog.group.name}” and all of its expenses will be permanently deleted.`}
          onConfirm={() => deleteGroup(uid, dialog.group.id)}
          onClose={close}
        />
      )}
    </aside>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-white hover:text-slate-800"
    >
      {children}
    </button>
  )
}
