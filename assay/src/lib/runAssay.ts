import type { AssayResult } from '../types/assay'
import { assayApplication } from './gemini'
import { openaiCompatAssay } from './openaiCompat'
import {
  PROVIDERS,
  PROVIDER_ORDER,
  RateLimitError,
  type ProviderId,
} from './providers'

export interface RunOutcome {
  result: AssayResult
  usedProvider: ProviderId
  fellBackFrom?: ProviderId
}

function isRateLimit(e: unknown): e is RateLimitError {
  return e instanceof RateLimitError || (e instanceof Error && e.name === 'RateLimitError')
}

export async function runAssay(
  active: ProviderId,
  keys: Partial<Record<ProviderId, string>>,
  resume: string,
  jd: string,
): Promise<RunOutcome> {
  const callOne = (id: ProviderId): Promise<AssayResult> => {
    const key = keys[id]!
    if (PROVIDERS[id].kind === 'gemini') {
      return assayApplication(key, resume, jd)
    }
    return openaiCompatAssay(PROVIDERS[id], key, resume, jd)
  }

  try {
    const result = await callOne(active)
    return { result, usedProvider: active }
  } catch (e) {
    if (!isRateLimit(e)) throw e

    const fallbackId = PROVIDER_ORDER.find(
      (id) => id !== active && keys[id]?.trim(),
    )
    if (!fallbackId) {
      const hint = ' Add a Groq or Cerebras key for automatic failover.'
      if (e instanceof RateLimitError && !e.message.includes(hint.trim())) {
        e.message = e.message + hint
      }
      throw e
    }

    try {
      const result = await callOne(fallbackId)
      return { result, usedProvider: fallbackId, fellBackFrom: active }
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      throw new Error(
        `${PROVIDERS[active].label} is rate-limited and the fallback (${PROVIDERS[fallbackId].label}) also failed: ${fallbackMessage}`,
      )
    }
  }
}
