import type { AssayResult } from '../types/assay'
import { RateLimitError } from './providers'
import { validateAssayResult } from './validate'

export const SYSTEM_PROMPT = `You are Assay, an expert hiring-team simulator. A candidate gives you their master resume and a job description. You produce a complete, tailored application package AND grade it honestly, the way a real hiring team would.

Rules you must follow:
1. NEVER fabricate experience, metrics, employers, degrees, or skills. You may reframe, reorder, and emphasize what exists in the master resume — nothing more.
2. The tailored CV must be in clean Markdown: name block, summary tailored to the role, skills reordered to mirror the JD's language, experience bullets rewritten to surface the most relevant evidence first, education, certifications. Keep it ATS-friendly (standard headings, no tables, no graphics).
3. The cover letter must be specific to the company and role, under 350 words, human in tone — no 'I am writing to express my interest'.
4. Form answers: anticipate the 3 most likely application-form / screening questions for this exact role (not logistics like notice period — pick substantive ones like 'describe a project where...') and answer them from the resume's evidence.
5. Grade across exactly these 5 dimensions (0-100 each): 'Requirements match', 'Evidence strength', 'Domain familiarity', 'Seniority and scope', 'Keyword / ATS alignment'. Be honest — a weak domain score is useful information, not an insult.
6. The overall score is a holistic judgment, roughly the weighted blend of the dimensions, not necessarily the mean.
7. The screening panel has exactly 3 reviewers, in this order: RECRUITER (a first-pass screener who gives the CV about 6 seconds — title 'First-pass screen'), HIRING MGR (the person who owns the role — give them a fitting title), FACT-CHECK (a claim verifier — title 'Claim verifier'). The fact-checker MUST name anything that was softened, stretched, or is unsupported by the resume, and confirm what traces to real evidence. If everything is solid, say so explicitly.
8. Summary: 2-3 sentences. State the genuine strengths, and name the single biggest honest gap if one exists — surfaced, not papered over.
9. companyContext: short descriptor of the company and domain, e.g. 'B2B SaaS, payments'. Infer from the JD; if unknown, use the role's industry.
SIGNALS: Additionally extract 8–14 skill signals. Each signal is one concrete, specific skill, tool, methodology, or domain the job description actually asks for (e.g. "Playwright", "API testing", "SQL", "GHS compliance") — never soft skills like "communication" or "teamwork", never whole sentences. demand is REQUIRED if the JD treats it as a must-have, PREFERRED otherwise. evidence grades the master resume honestly: STRONG = clear demonstrated experience, WEAK = mentioned or adjacent but thin, MISSING = absent. Use the resume only; do not invent evidence. Keep skill names short (1–4 words) and consistently capitalized.`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    roleTitle: { type: 'STRING' },
    company: { type: 'STRING' },
    companyContext: { type: 'STRING' },
    verdict: {
      type: 'STRING',
      enum: ['STRONG MATCH', 'GOOD MATCH', 'PARTIAL MATCH', 'WEAK MATCH'],
    },
    overallScore: { type: 'INTEGER' },
    summary: { type: 'STRING' },
    dimensions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          score: { type: 'INTEGER' },
          note: { type: 'STRING' },
        },
        required: ['label', 'score'],
      },
    },
    reviewers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          role: { type: 'STRING', enum: ['RECRUITER', 'HIRING MGR', 'FACT-CHECK'] },
          title: { type: 'STRING' },
          comment: { type: 'STRING' },
        },
        required: ['role', 'title', 'comment'],
      },
    },
    tailoredCv: { type: 'STRING' },
    coverLetter: { type: 'STRING' },
    formAnswers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          answer: { type: 'STRING' },
        },
        required: ['question', 'answer'],
      },
    },
    signals: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          skill: { type: 'STRING' },
          demand: { type: 'STRING', enum: ['REQUIRED', 'PREFERRED'] },
          evidence: { type: 'STRING', enum: ['STRONG', 'WEAK', 'MISSING'] },
        },
        required: ['skill', 'demand', 'evidence'],
      },
    },
  },
  required: [
    'roleTitle',
    'company',
    'companyContext',
    'verdict',
    'overallScore',
    'summary',
    'dimensions',
    'reviewers',
    'tailoredCv',
    'coverLetter',
    'formAnswers',
    'signals',
  ],
}

export async function assayApplication(
  apiKey: string,
  resume: string,
  jobDescription: string,
): Promise<AssayResult> {
  const attempt = async (): Promise<string> => {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' +
        encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'MASTER RESUME:\n' + resume + '\n\n---\n\nJOB DESCRIPTION:\n' + jobDescription,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.4,
          },
        }),
      },
    )

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`
      try {
        const err = await res.json()
        if (err?.error?.message) message = err.error.message
      } catch {
        // keep the status-based message
      }
      if (res.status === 400 && /api key/i.test(message)) {
        throw new Error('Your API key looks invalid. Check it and try again.')
      }
      if (res.status === 429) {
        throw new RateLimitError('gemini', 'Gemini')
      }
      if (res.status >= 500) {
        const serverError = new Error(message) as Error & { retryable?: boolean }
        serverError.retryable = true
        throw serverError
      }
      throw new Error(message)
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('The model returned an empty response. Try again.')
    }
    return text
  }

  let text: string
  try {
    text = await attempt()
  } catch (e) {
    const retryable =
      e instanceof TypeError || // fetch itself rejected (network error)
      (e instanceof Error && (e as Error & { retryable?: boolean }).retryable === true)
    if (!retryable) throw e
    await new Promise((r) => setTimeout(r, 1500))
    text = await attempt()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The model returned malformed JSON. Run the assay again.')
  }
  return validateAssayResult(parsed)
}
