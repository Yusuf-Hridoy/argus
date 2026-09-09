import type { AssayResult } from '../types/assay'

export interface SavedAssay {
  id: string
  createdAt: number
  jd: string
  result: AssayResult
}

const KEY = 'assay.history'
const MAX_ENTRIES = 50

function read(): SavedAssay[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is SavedAssay =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as SavedAssay).id === 'string' &&
        typeof (e as SavedAssay).createdAt === 'number' &&
        typeof (e as SavedAssay).result === 'object' &&
        (e as SavedAssay).result !== null,
    )
  } catch {
    return []
  }
}

function write(list: SavedAssay[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function listAssays(): SavedAssay[] {
  return read()
}

export function saveAssay(jd: string, result: AssayResult): SavedAssay {
  const saved: SavedAssay = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    jd,
    result,
  }
  const list = [saved, ...read()].slice(0, MAX_ENTRIES)
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
  return saved
}

export function deleteAssay(id: string): void {
  write(read().filter((e) => e.id !== id))
}

export function getAssay(id: string): SavedAssay | undefined {
  return read().find((e) => e.id === id)
}
