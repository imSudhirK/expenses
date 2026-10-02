import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { subscribeGroups } from '../data/groups'
import { importGroups } from '../data/importExpenses'
import { askAi, type ChatTurn, type ParsedGroup } from '../lib/ai'
import { formatDate, formatMoney } from '../lib/format'
import { TYPE_DOT, TYPE_TEXT } from '../lib/typeColors'
import type { Group } from '../lib/types'

type Status = 'pending' | 'saving' | 'saved' | 'discarded'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** What the model actually returned (JSON), replayed as history for follow-ups. */
  raw?: string
  groups?: ParsedGroup[]
  status?: Status
  error?: string
  isError?: boolean
}

const EXAMPLE = `Jan 2026 – rent 15000 paid, school fees 8000 paid 3000 due 10 Jan, SIP 5000
Feb 2026 – rent 15000, electricity 2200`

let nextId = 1

export default function AiAssistant({ uid }: { uid: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => (open ? subscribeGroups(uid, setGroups, () => {}) : undefined), [uid, open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const patch = (id: number, changes: Partial<Message>) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...changes } : m)))

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const userMsg: Message = { id: nextId++, role: 'user', text }
    const convo = [...messages, userMsg]
    setMessages(convo)
    setInput('')
    setBusy(true)
    const history: ChatTurn[] = convo
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.raw ?? m.text }))
    try {
      const reply = await askAi(history, groups.map((g) => g.name))
      setMessages((ms) => [
        // A newer result supersedes any earlier unsaved preview.
        ...ms.map((m) => (m.status === 'pending' ? { ...m, status: 'discarded' as const } : m)),
        {
          id: nextId++,
          role: 'assistant',
          text: reply.message || (reply.groups.length ? 'Here is what I found:' : 'I could not find any expenses in that.'),
          raw: reply.raw,
          groups: reply.groups.length ? reply.groups : undefined,
          status: reply.groups.length ? 'pending' : undefined,
        },
      ])
    } catch (err) {
      setMessages((ms) => [...ms, { id: nextId++, role: 'assistant', text: (err as Error).message, isError: true }])
    } finally {
      setBusy(false)
    }
  }

  const save = async (m: Message) => {
    patch(m.id, { status: 'saving', error: undefined })
    try {
      const count = await importGroups(uid, m.groups!, groups)
      patch(m.id, { status: 'saved' })
      setMessages((ms) => [
        ...ms,
        { id: nextId++, role: 'assistant', text: `Added ${count} expense${count === 1 ? '' : 's'} in ${m.groups!.length} group${m.groups!.length === 1 ? '' : 's'} ✓` },
      ])
    } catch (err) {
      patch(m.id, { status: 'pending', error: `Save failed: ${(err as Error).message}. Some items may already be saved.` })
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const existing = new Set(groups.map((g) => g.name.trim().toLowerCase()))

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ai-assist-panel"
        className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-indigo-700 ${open ? 'max-sm:hidden' : ''}`}
      >
        <SparkleIcon />
        AI Assist
      </button>

      {open && (
        <section
          id="ai-assist-panel"
          aria-label="AI Assist"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:inset-x-auto sm:bottom-20 sm:right-4 sm:h-[560px] sm:max-h-[calc(100vh-6rem)] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <SparkleIcon />
              </span>
              <div>
                <h2 className="text-sm font-semibold">AI Assist</h2>
                <p className="text-xs text-slate-500">Describe expenses in any format</p>
              </div>
            </div>
            <button aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">
                <p className="mb-2">Paste or type your expenses and I'll organise them into groups. For example:</p>
                <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-sans text-xs text-slate-700">{EXAMPLE}</pre>
                <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => setInput(EXAMPLE)}>
                  Use this example
                </button>
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="ml-8 whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="mr-4 space-y-2">
                  <div className={`rounded-2xl rounded-bl-sm px-3 py-2 text-sm ring-1 ${m.isError ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-white text-slate-700 ring-slate-200'}`}>
                    {m.text}
                  </div>
                  {m.groups && <Preview message={m} existing={existing} onSave={() => save(m)} onDiscard={() => patch(m.id, { status: 'discarded' })} />}
                </div>
              ),
            )}

            {busy && <div className="mr-4 w-fit rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">Thinking…</div>}
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 p-3">
            <textarea
              className="input max-h-32 min-h-[2.5rem] resize-none"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. rent 15000 paid, gym 1500 due 5th"
              aria-label="Message"
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </>
  )
}

function Preview({ message, existing, onSave, onDiscard }: { message: Message; existing: Set<string>; onSave: () => void; onDiscard: () => void }) {
  const { groups = [], status, error } = message
  const total = groups.reduce((n, g) => n + g.expenses.length, 0)
  const inactive = status === 'saved' || status === 'discarded'

  return (
    <div className={`rounded-xl bg-white p-3 ring-1 ring-slate-200 ${inactive ? 'opacity-60' : ''}`}>
      {groups.map((g) => (
        <div key={g.name} className="mb-3 last:mb-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{g.name}</h3>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${existing.has(g.name.toLowerCase()) ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
              {existing.has(g.name.toLowerCase()) ? 'existing' : 'new'}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {g.expenses.map((e, i) => (
              <li key={i} className="flex items-start gap-2 py-1.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[e.type]}`} title={e.type} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${TYPE_TEXT[e.type]}`}>{e.title}</p>
                  <p className="text-xs text-slate-500">
                    <span className="capitalize">{e.type}</span>
                    {e.paidAmount > 0 && ` · paid ${formatMoney(e.paidAmount)}`}
                    {e.dueDate && ` · due ${formatDate(e.dueDate)}`}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">{formatMoney(e.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {status === 'saved' ? (
          <span className="text-xs font-medium text-emerald-600">Saved</span>
        ) : status === 'discarded' ? (
          <span className="text-xs text-slate-500">Discarded</span>
        ) : (
          <>
            <button className="btn-secondary" onClick={onDiscard} disabled={status === 'saving'}>Discard</button>
            <button className="btn-primary" onClick={onSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : `Save ${total} expense${total === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
      <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity=".7" />
    </svg>
  )
}
