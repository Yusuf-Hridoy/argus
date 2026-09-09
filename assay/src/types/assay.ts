export interface Dimension { label: string; score: number; note?: string }
export interface Reviewer { role: 'RECRUITER' | 'HIRING MGR' | 'FACT-CHECK'; title: string; comment: string }
export interface FormAnswer { question: string; answer: string }
export interface AssayResult {
  roleTitle: string
  company: string
  companyContext: string
  verdict: 'STRONG MATCH' | 'GOOD MATCH' | 'PARTIAL MATCH' | 'WEAK MATCH'
  overallScore: number
  summary: string
  dimensions: Dimension[]
  reviewers: Reviewer[]
  tailoredCv: string
  coverLetter: string
  formAnswers: FormAnswer[]
}
