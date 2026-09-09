import type { AssayResult, InterviewPrep } from '../types/assay'

export type AppStatus = 'SAVED' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED'

export interface SavedAssay {
  id: string
  createdAt: number
  jd: string
  result: AssayResult
  status: AppStatus
  notes: string
  appliedAt?: number
  rerunOf?: string
  prep?: InterviewPrep
}

export const STATUS_ORDER: AppStatus[] = [
  'SAVED',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
]

export const STATUS_LABELS: Record<AppStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
}

const KEY = 'assay.history'
const MAX_ENTRIES = 50

function migrate(e: SavedAssay): SavedAssay {
  const status = STATUS_ORDER.includes(e.status) ? e.status : 'SAVED'
  const migrated: SavedAssay = {
    ...e,
    status,
    notes: typeof e.notes === 'string' ? e.notes : '',
  }
  if (
    migrated.prep &&
    (!Array.isArray(migrated.prep.questions) || migrated.prep.questions.length === 0)
  ) {
    delete migrated.prep
  }
  return migrated
}

function read(): SavedAssay[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is SavedAssay =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as SavedAssay).id === 'string' &&
          typeof (e as SavedAssay).createdAt === 'number' &&
          typeof (e as SavedAssay).result === 'object' &&
          (e as SavedAssay).result !== null,
      )
      .map(migrate)
  } catch {
    return []
  }
}

function write(list: SavedAssay[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

function writeQuotaSafe(list: SavedAssay[]): void {
  try {
    write(list)
  } catch {
    const half = Math.ceil(list.length / 2)
    try {
      write(list.slice(0, half))
    } catch {
      throw new Error(
        'Could not save to history — browser storage is full. Delete some old assays.',
      )
    }
  }
}

export function listAssays(): SavedAssay[] {
  return read()
}

export function saveAssay(
  jd: string,
  result: AssayResult,
  rerunOf?: string,
): SavedAssay {
  const saved: SavedAssay = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    jd,
    result,
    status: 'SAVED',
    notes: '',
    rerunOf,
  }
  const list = [saved, ...read()].slice(0, MAX_ENTRIES)
  writeQuotaSafe(list)
  return saved
}

export function updateAssay(
  id: string,
  patch: Partial<Pick<SavedAssay, 'status' | 'notes' | 'prep'>>,
): SavedAssay | undefined {
  const list = read()
  const index = list.findIndex((e) => e.id === id)
  if (index === -1) return undefined
  const entry = { ...list[index], ...patch }
  if (patch.status === 'APPLIED' && entry.appliedAt === undefined) {
    entry.appliedAt = Date.now()
  }
  list[index] = entry
  writeQuotaSafe(list)
  return entry
}

export function deleteAssay(id: string): void {
  write(read().filter((e) => e.id !== id))
}

export function getAssay(id: string): SavedAssay | undefined {
  return read().find((e) => e.id === id)
}
