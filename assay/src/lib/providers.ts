export type ProviderId = 'gemini' | 'groq' | 'cerebras'

export interface ProviderInfo {
  id: ProviderId
  label: string
  model: string
  kind: 'gemini' | 'openai'
  baseUrl: string
  keyUrl: string
  keyUrlLabel: string
  keyPlaceholder: string
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    model: 'gemini-3.5-flash',
    kind: 'gemini',
    baseUrl: '',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'Google AI Studio',
    keyPlaceholder: 'AIza…',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'Groq Console',
    keyPlaceholder: 'gsk_…',
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    model: 'gpt-oss-120b',
    kind: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    keyUrl: 'https://cloud.cerebras.ai',
    keyUrlLabel: 'Cerebras Cloud',
    keyPlaceholder: 'csk-…',
  },
}

export const PROVIDER_ORDER: ProviderId[] = ['gemini', 'groq', 'cerebras']

export class RateLimitError extends Error {
  providerId: ProviderId
  label: string

  constructor(providerId: ProviderId, label: string) {
    super(`Rate limit hit on ${label}. Wait a minute and retry.`)
    this.name = 'RateLimitError'
    this.providerId = providerId
    this.label = label
  }
}

const KEYS_KEY = 'assay.keys'
const ACTIVE_KEY = 'assay.provider'
const LEGACY_KEY = 'assay.geminiKey'

function isProviderId(v: unknown): v is ProviderId {
  return v === 'gemini' || v === 'groq' || v === 'cerebras'
}

export function loadKeys(): Partial<Record<ProviderId, string>> {
  try {
    const raw = localStorage.getItem(KEYS_KEY)
    if (raw === null) {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy !== null) {
        const migrated: Partial<Record<ProviderId, string>> = { gemini: legacy }
        try {
          localStorage.setItem(KEYS_KEY, JSON.stringify(migrated))
          localStorage.removeItem(LEGACY_KEY)
        } catch {
          // storage unavailable — still return the migrated keys in memory
        }
        return migrated
      }
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const keys: Partial<Record<ProviderId, string>> = {}
    for (const id of PROVIDER_ORDER) {
      const v = (parsed as Record<string, unknown>)[id]
      if (typeof v === 'string' && v) keys[id] = v
    }
    return keys
  } catch {
    return {}
  }
}

export function saveKeys(keys: Partial<Record<ProviderId, string>>): void {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
}

export function loadActiveProvider(
  keys: Partial<Record<ProviderId, string>>,
): ProviderId {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (isProviderId(raw) && keys[raw]) return raw
  } catch {
    // fall through to key-based fallback
  }
  for (const id of PROVIDER_ORDER) {
    if (keys[id]) return id
  }
  return 'gemini'
}

export function saveActiveProvider(id: ProviderId): void {
  localStorage.setItem(ACTIVE_KEY, id)
}
