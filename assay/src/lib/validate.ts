import type { AssayResult, Reviewer } from '../types/assay'

const VERDICTS: AssayResult['verdict'][] = [
  'STRONG MATCH',
  'GOOD MATCH',
  'PARTIAL MATCH',
  'WEAK MATCH',
]

const REVIEWER_ROLES: Reviewer['role'][] = ['RECRUITER', 'HIRING MGR', 'FACT-CHECK']

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function validateAssayResult(obj: unknown): AssayResult {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('The model returned an unusable response. Run the assay again.')
  }
  const raw = obj as Record<string, unknown>

  const tailoredCv = asString(raw.tailoredCv)
  const coverLetter = asString(raw.coverLetter)
  if (!tailoredCv.trim() && !coverLetter.trim()) {
    throw new Error('The model returned an unusable response. Run the assay again.')
  }

  const roleTitle = asString(raw.roleTitle) || 'Untitled role'
  const company = asString(raw.company) || 'Unknown company'

  const verdict = VERDICTS.includes(raw.verdict as AssayResult['verdict'])
    ? (raw.verdict as AssayResult['verdict'])
    : 'PARTIAL MATCH'

  const dimensions: AssayResult['dimensions'] = Array.isArray(raw.dimensions)
    ? raw.dimensions
        .filter(
          (d): d is { label: string; score: number; note?: string } =>
            typeof d === 'object' &&
            d !== null &&
            typeof (d as { label?: unknown }).label === 'string' &&
            typeof (d as { score?: unknown }).score === 'number',
        )
        .map((d) => ({
          label: d.label,
          score: asScore(d.score),
          ...(typeof d.note === 'string' && d.note ? { note: d.note } : {}),
        }))
    : []

  const reviewers: Reviewer[] = Array.isArray(raw.reviewers)
    ? raw.reviewers
        .filter(
          (r): r is Reviewer =>
            typeof r === 'object' &&
            r !== null &&
            REVIEWER_ROLES.includes((r as Reviewer).role) &&
            typeof (r as Reviewer).comment === 'string',
        )
        .map((r) => ({
          role: r.role,
          title: asString(r.title),
          comment: r.comment,
        }))
    : []
  for (const role of REVIEWER_ROLES) {
    if (!reviewers.some((r) => r.role === role)) {
      reviewers.push({
        role,
        title: 'No response',
        comment: 'No comment returned — re-run for the full panel.',
      })
    }
  }
  reviewers.sort(
    (a, b) => REVIEWER_ROLES.indexOf(a.role) - REVIEWER_ROLES.indexOf(b.role),
  )

  const formAnswers: AssayResult['formAnswers'] = Array.isArray(raw.formAnswers)
    ? raw.formAnswers
        .filter(
          (f): f is { question: string; answer: string } =>
            typeof f === 'object' &&
            f !== null &&
            typeof (f as { question?: unknown }).question === 'string' &&
            (f as { question: string }).question.trim() !== '' &&
            typeof (f as { answer?: unknown }).answer === 'string' &&
            (f as { answer: string }).answer.trim() !== '',
        )
        .map((f) => ({ question: f.question, answer: f.answer }))
    : []

  return {
    roleTitle,
    company,
    companyContext: asString(raw.companyContext),
    verdict,
    overallScore: asScore(raw.overallScore),
    summary: asString(raw.summary),
    dimensions,
    reviewers,
    tailoredCv,
    coverLetter,
    formAnswers,
  }
}
