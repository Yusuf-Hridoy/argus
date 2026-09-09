import { useEffect, useRef, useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import InputPanel from './components/InputPanel'
import ScoreCard from './components/ScoreCard'
import PackageTabs from './components/PackageTabs'
import { assayApplication } from './lib/gemini'
import type { AssayResult } from './types/assay'

const cardClass =
  'rounded-xl border border-[#d8d1bf] bg-[#faf7f0] shadow-[0_1px_2px_rgba(40,35,25,0.06),0_8px_24px_rgba(40,35,25,0.06)]'

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('assay.geminiKey') ?? '')
  const [keyDraft, setKeyDraft] = useState('')
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [resume, setResume] = useState(() => localStorage.getItem('assay.masterResume') ?? '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AssayResult | null>(null)

  useEffect(() => {
    if (!popoverOpen) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popoverOpen])

  const saveKey = () => {
    const key = keyDraft.trim()
    if (!key) return
    localStorage.setItem('assay.geminiKey', key)
    setApiKey(key)
    setKeyDraft('')
    setPopoverOpen(false)
  }

  const saveResume = () => {
    if (!resume.trim()) return
    localStorage.setItem('assay.masterResume', resume)
    setResumeSaved(true)
    setTimeout(() => setResumeSaved(false), 2000)
  }

  const handleFileLoaded = (text: string) => {
    setResume(text)
    localStorage.setItem('assay.masterResume', text)
    setResumeSaved(true)
    setTimeout(() => setResumeSaved(false), 2000)
  }

  const canRun = apiKey.length > 0 && resume.trim().length > 100 && jd.trim().length > 100

  const handleResumeChange = (v: string) => {
    setResume(v)
    setResumeSaved(false)
  }

  const STAGES = [
    'Reading the job post…',
    'Tailoring your CV…',
    'Writing the cover letter…',
    'Recruiter doing the 6-second scan…',
    'Hiring manager reviewing fit…',
    'Fact-checker verifying every claim…',
  ]

  const onRun = () => {
    setLoading(true)
    setError(null)
    let i = 0
    setLoadingStage(STAGES[0])
    const iv = setInterval(() => {
      i = (i + 1) % STAGES.length
      setLoadingStage(STAGES[i])
    }, 3200)
    assayApplication(apiKey, resume, jd)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        clearInterval(iv)
        setLoading(false)
      })
  }

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="border-b border-[#ddd6c4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 rounded-[4px] bg-[#26221b]" />
            <span className="text-lg font-bold tracking-tight">Assay</span>
            <span className="ml-2 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a8371] sm:inline">
              Personal · Private
            </span>
          </div>
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setPopoverOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-[#d8d1bf] bg-[#faf7f0] px-3.5 py-2 text-[13px] font-medium text-[#26221b] transition-colors hover:bg-[#f2eee2]"
            >
              {apiKey ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#5a8a3e]" />
                  Key connected
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Add Gemini API key
                </>
              )}
            </button>
            {popoverOpen && (
              <div className={`${cardClass} absolute right-0 top-full z-50 mt-2 w-80 p-5`}>
                <h3 className="text-[14px] font-semibold">Gemini API key</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8a8371]">
                  Free key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#b3492b] underline underline-offset-2"
                  >
                    Google AI Studio
                  </a>
                  . Stored only in this browser.
                </p>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                  placeholder="AIza…"
                  className="mt-3.5 w-full rounded-lg border border-[#e2dccb] bg-[#f2eee2]/50 px-3.5 py-2.5 font-mono text-[13px] text-[#26221b] placeholder:text-[#a39b86] focus:border-[#b3492b]/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={!keyDraft.trim()}
                  className="mt-3 w-full rounded-lg bg-[#26221b] py-2.5 text-[13px] font-semibold text-[#f4f0e4] transition-colors hover:bg-[#3a352c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save key
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* HERO */}
        <section className="max-w-2xl pt-14 pb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#b3492b]">
            The Interview Pipeline
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Paste any job. Get a tailored, graded application.
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-[#6f6858]">
            Your CV, cover letter, and form answers — rewritten for that exact
            role, then scored by a recruiter, a hiring manager, and a
            fact-checker before you send.
          </p>
        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 items-start gap-6 pb-16 lg:grid-cols-[5fr_7fr]">
          <InputPanel
            resume={resume}
            setResume={handleResumeChange}
            resumeSaved={resumeSaved}
            onSaveResume={saveResume}
            onFileLoaded={handleFileLoaded}
            jd={jd}
            setJd={setJd}
            loading={loading}
            loadingStage={loadingStage}
            canRun={canRun}
            onRun={onRun}
          />
          <div className="flex flex-col gap-6">
            {error && !loading && (
              <div className="rounded-xl border border-[#e3b39d] bg-[#f7e8e0] px-5 py-4 text-[13.5px] leading-relaxed text-[#8a3418]">
                <span className="font-bold">Assay failed.</span> {error}
              </div>
            )}
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#cfc7b2] bg-[#faf7f0]/40 px-8">
                <div className="flex flex-col items-center gap-5">
                  <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#e2dccb] border-t-[#26221b]" />
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#8a8371]">
                    {loadingStage}
                  </p>
                  <p className="text-[12.5px] text-[#8a8371]">
                    One call, full package — no fabrication allowed.
                  </p>
                </div>
              </div>
            ) : result ? (
              <>
                <ScoreCard result={result} />
                <PackageTabs result={result} />
              </>
            ) : error ? null : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#cfc7b2] bg-[#faf7f0]/40 px-8">
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                  <ShieldCheck className="h-8 w-8 text-[#b6ad97]" />
                  <p className="text-[14px] leading-relaxed text-[#8a8371]">
                    {apiKey
                      ? 'Your graded package will appear here — match score, dimension assay, and the three-reviewer panel.'
                      : 'Add your Gemini API key first (top right), then paste a job description and run your first assay.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#ddd6c4]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-[#8a8371]">
            Your resume and key stay in this browser. Never uploaded anywhere
            else.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a8371]">
            Assay · Built for one
          </p>
        </div>
      </footer>
    </div>
  )
}
