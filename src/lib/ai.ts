import { AIError, getAI, getGenerativeModel, GoogleAIBackend, Schema, type Content } from 'firebase/ai'
import { app } from './firebase'
import { fromDateInput, toDateInput } from './format'
import { EXPENSE_TYPES, type ExpenseInput, type ExpenseType } from './types'

// Free-tier Gemini models via Firebase AI Logic (Gemini Developer API). No API key ships to the browser.
// Tried in order: the free tier often returns "high demand" errors, so fall back to older/lighter models.
const MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite']
const ATTEMPTS_PER_MODEL = 2
const BACKOFF_MS = [800, 2000]

const ai = getAI(app, { backend: new GoogleAIBackend() })

const responseSchema = Schema.object({
  properties: {
    message: Schema.string({ description: 'Short reply to the user, or a clarifying question if nothing could be parsed.' }),
    groups: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string({ description: 'Group name, max 60 chars, e.g. "Jan 2026".' }),
          expenses: Schema.array({
            items: Schema.object({
              properties: {
                title: Schema.string({ description: 'Max 100 chars.' }),
                amount: Schema.integer({ description: 'Whole rupees, >= 0.' }),
                paidAmount: Schema.integer({ description: 'Whole rupees, 0..amount.' }),
                type: Schema.enumString({ enum: [...EXPENSE_TYPES] }),
                dueDate: Schema.string({ description: 'YYYY-MM-DD, or null if not given.', nullable: true }),
              },
            }),
          }),
        },
      }),
    }),
  },
})

const systemInstruction = (existingGroups: string[]) => `
You help the user enter expenses into an expense tracker. The user describes expenses in any loose format
(lists, sentences, CSV, tables). Turn them into groups of expenses.

Rules:
- Today is ${toDateInput(new Date())}. Resolve relative dates ("next Friday", "10th") against today.
- Currency is INR. Amounts are whole numbers ("15k" = 15000, "1.2L" = 120000). Round decimals.
- paidAmount defaults to 0. "paid"/"done" without a number means fully paid (paidAmount = amount).
  paidAmount must never exceed amount.
- type is one of: ${EXPENSE_TYPES.join(', ')}. Use education for school/college/courses/books,
  investment for SIP/mutual funds/stocks/FD/insurance/gold, personal for rent/bills/food/shopping/travel/health,
  others otherwise.
- dueDate is null unless the user gives a due/payment date.
- Group by the period or heading the user gives. If none is given, use one group named after the current month, e.g. "${new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date())}".
- Existing groups: ${existingGroups.length ? existingGroups.map((g) => JSON.stringify(g)).join(', ') : '(none)'}.
  If the user refers to one of these, use its exact name.
- Group names max 60 chars, titles max 100 chars.
- When the user asks to change a previous result, return the full corrected list, not just the change.
- If the input has no expenses, return an empty groups array and ask a short clarifying question in message.
- message is one short sentence; do not repeat the list in it.
`.trim()

export interface ParsedGroup {
  name: string
  expenses: ExpenseInput[]
}

export interface AiReply {
  message: string
  groups: ParsedGroup[]
  /** Raw model output, kept so follow-up turns see what the model said. */
  raw: string
}

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

const toInt = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 0
}

const toDate = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = fromDateInput(v)
  return d && !Number.isNaN(d.getTime()) ? d : null
}

/** Coerce model output into values the Firestore rules accept; drop anything unusable. */
function sanitize(data: unknown): Omit<AiReply, 'raw'> {
  const d = (data ?? {}) as { message?: unknown; groups?: unknown }
  const groups = (Array.isArray(d.groups) ? d.groups : [])
    .map((g: { name?: unknown; expenses?: unknown }): ParsedGroup => ({
      name: String(g?.name ?? '').trim().slice(0, 60),
      expenses: (Array.isArray(g?.expenses) ? g.expenses : [])
        .map((e: Record<string, unknown>) => {
          const amount = toInt(e?.amount)
          return {
            title: String(e?.title ?? '').trim().slice(0, 100),
            amount,
            paidAmount: Math.min(toInt(e?.paidAmount), amount),
            type: (EXPENSE_TYPES as readonly unknown[]).includes(e?.type) ? (e.type as ExpenseType) : 'others',
            dueDate: toDate(e?.dueDate),
          }
        })
        .filter((e) => e.title),
    }))
    .filter((g) => g.name && g.expenses.length)
  return { message: typeof d.message === 'string' ? d.message : '', groups }
}

const status = (err: unknown) => (err instanceof AIError ? err.customErrorData?.status : undefined)

/** Overloaded, rate-limited or network failure: worth retrying. */
const isTransient = (err: unknown) => {
  const s = status(err)
  return s === undefined ? err instanceof AIError && err.code === 'fetch-error' : [429, 500, 503, 504].includes(s)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Send the conversation to Gemini and get back structured groups of expenses. */
export async function askAi(history: ChatTurn[], existingGroups: string[]): Promise<AiReply> {
  const contents: Content[] = history.map((t) => ({ role: t.role, parts: [{ text: t.text }] }))
  let lastError: unknown
  for (const name of MODELS) {
    const model = getGenerativeModel(ai, {
      model: name,
      systemInstruction: systemInstruction(existingGroups),
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.2 },
    })
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const result = await model.generateContent({ contents })
        return parseReply(result.response.text())
      } catch (err) {
        lastError = err
        if (status(err) === 404) break // model not available here; try the next one
        if (!isTransient(err)) throw err
        if (attempt < ATTEMPTS_PER_MODEL - 1) await sleep(BACKOFF_MS[attempt])
      }
    }
  }
  throw new Error(
    status(lastError) === 429
      ? 'The free AI quota is used up for now. Please try again in a few minutes.'
      : 'The AI service is busy right now. Please try again in a minute.',
  )
}

function parseReply(raw: string): AiReply {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The AI returned an unreadable answer. Please try again.')
  }
  return { ...sanitize(parsed), raw }
}
