import type { AssayResult } from '../types/assay'
import { SYSTEM_PROMPT } from './gemini'
import { RateLimitError, type ProviderInfo } from './providers'
import { validateAssayResult } from './validate'

const JSON_SHAPE_ADDENDUM = `Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "roleTitle": string,
  "company": string,
  "companyContext": string,
  "verdict": "STRONG MATCH" | "GOOD MATCH" | "PARTIAL MATCH" | "WEAK MATCH",
  "overallScore": integer 0-100,
  "summary": string,
  "dimensions": [ { "label": string, "score": integer 0-100, "note": string } ]  // exactly 5, labels: "Requirements match", "Evidence strength", "Domain familiarity", "Seniority and scope", "Keyword / ATS alignment"
  "reviewers": [ { "role": "RECRUITER" | "HIRING MGR" | "FACT-CHECK", "title": string, "comment": string } ]  // exactly 3, one per role, in that order
  "tailoredCv": string (markdown),
  "coverLetter": string,
  "formAnswers": [ { "question": string, "answer": string } ]  // exactly 3
}`

export async function openaiCompatAssay(
  info: ProviderInfo,
  apiKey: string,
  resume: string,
  jobDescription: string,
): Promise<AssayResult> {
  const res = await fetch(`${info.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: info.model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n' + JSON_SHAPE_ADDENDUM,
        },
        {
          role: 'user',
          content:
            'MASTER RESUME:\n' + resume + '\n\n---\n\nJOB DESCRIPTION:\n' + jobDescription,
        },
      ],
    }),
  })

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const err = await res.json()
      if (err?.error?.message) message = err.error.message
    } catch {
      // keep the status-based message
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Your ${info.label} API key looks invalid. Check it and try again.`,
      )
    }
    if (res.status === 429) {
      throw new RateLimitError(info.id, info.label)
    }
    if (res.status === 404) {
      throw new Error(
        `Model "${info.model}" was not found on ${info.label} — the provider may have retired it. Update the model id in src/lib/providers.ts.`,
      )
    }
    throw new Error(message)
  }

  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('The model returned an empty response. Try again.')
  }

  let text = content.trim()
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  if (!text.startsWith('{')) {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      text = text.slice(first, last + 1)
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The model returned malformed JSON. Run the assay again.')
  }
  return validateAssayResult(parsed)
}
