import { useEffect, useRef, useState } from 'react'
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import InputPanel from './components/InputPanel'
import ScoreCard from './components/ScoreCard'
import PackageTabs from './components/PackageTabs'
import HistoryPanel from './components/HistoryPanel'
import ProviderManager from './components/ProviderManager'
import NotesCard from './components/NotesCard'
import StatusPill from './components/StatusPill'
import TrackerStats from './components/TrackerStats'
import InsightsPanel from './components/InsightsPanel'
import RerunDiff, { type RerunDiff as RerunDiffData } from './components/RerunDiff'
import { runAssay } from './lib/runAssay'
import {
  loadActiveProvider,
  loadKeys,
  PROVIDERS,
  saveActiveProvider,
  saveKeys,
  type ProviderId,
} from './lib/providers'
import {
  listAssays,
  saveAssay,
  deleteAssay,
  updateAssay,
  type AppStatus,
} from './lib/storage'
import type { SavedAssay } from './lib/storage'
import { cardClass, microLabel } from './lib/ui'
import type { AssayResult } from './types/assay'

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function App() {
  const [keys, setKeys] = useState<Partial<Record<ProviderId, string>>>(() => loadKeys())
  const [activeProvider, setActiveProvider] = useState<ProviderId>(() =>
    loadActiveProvider(loadKeys()),
  )
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [resume, setResume] = useState(() => localStorage.getItem('assay.masterResume') ?? '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [fallbackInfo, setFallbackInfo] = useState<{ from: string; used: string } | null>(
    null,
  )
  const [result, setResult] = useState<AssayResult | null>(null)
  const [history, setHistory] = useState<SavedAssay[]>(() => listAssays())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [justRan, setJustRan] = useState(false)
  const [rerunDiff, setRerunDiff] = useState<RerunDiffData | null>(null)
  const intervalRef = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [])

  const onKeysChange = (next: Partial<Record<ProviderId, string>>) => {
    saveKeys(next)
    setKeys(next)
  }

  const onActiveChange = (id: ProviderId) => {
    saveActiveProvider(id)
    setActiveProvider(id)
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

  const canRun =
    Boolean(keys[activeProvider]) &&
    resume.trim().length > 100 &&
    jd.trim().length > 100

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

  const startRun = (jd: string, base?: SavedAssay) => {
    setLoading(true)
    setError(null)
    setFallbackInfo(null)
    setRerunDiff(null)
    let i = 0
    setLoadingStage(STAGES[0])
    const iv = setInterval(() => {
      i = (i + 1) % STAGES.length
      setLoadingStage(STAGES[i])
    }, 3200)
    intervalRef.current = iv
    runAssay(activeProvider, keys, resume, jd)
      .then((outcome) => {
        try {
          const saved = saveAssay(jd, outcome.result, base?.id)
          setHistory(listAssays())
          setActiveId(saved.id)
          setWarning(null)
        } catch {
          setWarning(
            "Result shown but couldn't be saved to history — browser storage is full.",
          )
        }
        if (outcome.fellBackFrom) {
          setFallbackInfo({
            from: PROVIDERS[outcome.fellBackFrom].label,
            used: PROVIDERS[outcome.usedProvider].label,
          })
        }
        if (base) {
          const prev = new Map(
            base.result.dimensions.map((d) => [d.label, d.score]),
          )
          setRerunDiff({
            fromScore: base.result.overallScore,
            toScore: outcome.result.overallScore,
            dimensions: outcome.result.dimensions
              .map((d) => {
                const from = prev.get(d.label)
                return from === undefined
                  ? null
                  : { label: d.label, delta: d.score - from }
              })
              .filter(
                (d): d is { label: string; delta: number } =>
                  d !== null && Math.abs(d.delta) >= 3,
              ),
          })
          setJd(base.jd)
        }
        setJustRan(true)
        setResult(outcome.result)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        clearInterval(iv)
        intervalRef.current = null
        setLoading(false)
      })
  }

  const onRun = () => startRun(jd)

  const handleRerun = (base: SavedAssay) => startRun(base.jd, base)

  const onOpenHistory = (item: SavedAssay) => {
    if (item.id !== activeId) setRerunDiff(null)
    setResult(item.result)
    setJd(item.jd)
    setActiveId(item.id)
    setError(null)
    setWarning(null)
    setFallbackInfo(null)
    setJustRan(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDeleteHistory = (id: string) => {
    deleteAssay(id)
    setHistory(listAssays())
    if (id === activeId) {
      setActiveId(null)
      setResult(null)
      setRerunDiff(null)
    }
  }

  const onCloseViewing = () => {
    setResult(null)
    setActiveId(null)
    setJustRan(false)
    setRerunDiff(null)
  }

  const handleStatusChange = (id: string, status: AppStatus) => {
    updateAssay(id, { status })
    setHistory(listAssays())
  }

  const handleNotesChange = (id: string, notes: string) => {
    updateAssay(id, { notes })
    setHistory(listAssays())
  }

  const activeAssay = history.find((h) => h.id === activeId) ?? null

  const hasAnyKey = Boolean(keys.gemini || keys.groq || keys.cerebras)
  const viewingSaved = activeId !== null && result !== null
  const savedItem = viewingSaved ? history.find((h) => h.id === activeId) : undefined

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
              {hasAnyKey ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#5a8a3e]" />
                  {PROVIDERS[activeProvider].label} connected
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Add API key
                </>
              )}
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-full z-50 mt-2">
                <ProviderManager
                  keys={keys}
                  activeProvider={activeProvider}
                  onKeysChange={onKeysChange}
                  onActiveChange={onActiveChange}
                />
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
          <div className="flex flex-col gap-6">
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
            <TrackerStats items={history} />
            <HistoryPanel
              items={history}
              activeId={activeId}
              onOpen={onOpenHistory}
              onDelete={onDeleteHistory}
              onStatusChange={handleStatusChange}
            />
            <InsightsPanel items={history} />
          </div>
          <div className="flex flex-col gap-6">
            {error && !loading && (
              <div className="rounded-xl border border-[#e3b39d] bg-[#f7e8e0] px-5 py-4 text-[13.5px] leading-relaxed text-[#8a3418]">
                <span className="font-bold">Assay failed.</span> {error}
              </div>
            )}
            {warning && !loading && (
              <div className="rounded-xl border border-[#e0c795] bg-[#f3e8d3] px-5 py-4 text-[13.5px] leading-relaxed text-[#8a5a1d]">
                {warning}
              </div>
            )}
            {fallbackInfo && !loading && (
              <div className="rounded-lg border border-[#e0c795] bg-[#f3e8d3] px-4 py-2.5 text-[13px] text-[#8a5a1d]">
                {fallbackInfo.from} was rate-limited — this assay ran on{' '}
                {fallbackInfo.used} instead.
              </div>
            )}
            {viewingSaved && !loading && (
              <div
                className={`${cardClass} flex items-center justify-between gap-3 px-4 py-2`}
              >
                <span className={microLabel}>
                  {justRan
                    ? 'Saved to history'
                    : `Viewing saved assay · ${
                        savedItem ? relativeDate(savedItem.createdAt) : ''
                      }`}
                </span>
                <div className="flex items-center gap-3">
                  {activeAssay && (
                    <StatusPill
                      status={activeAssay.status}
                      onChange={(s) => handleStatusChange(activeAssay.id, s)}
                    />
                  )}
                  {activeAssay && !justRan && (
                    <button
                      type="button"
                      onClick={() => handleRerun(activeAssay)}
                      disabled={loading || resume.trim().length < 100}
                      title={
                        resume.trim().length < 100
                          ? 'Save a master resume first'
                          : undefined
                      }
                      className="flex items-center gap-1.5 rounded-md py-1 text-[12px] text-[#8a8371] transition-colors hover:text-[#26221b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-run with current resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onCloseViewing}
                    className="text-[12.5px] text-[#8a8371] transition-colors hover:text-[#26221b]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {rerunDiff && !loading && result && <RerunDiff diff={rerunDiff} />}
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
                {activeAssay && (
                  <NotesCard
                    key={activeAssay.id}
                    assay={activeAssay}
                    onSave={handleNotesChange}
                  />
                )}
              </>
            ) : error ? null : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#cfc7b2] bg-[#faf7f0]/40 px-8">
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                  <ShieldCheck className="h-8 w-8 text-[#b6ad97]" />
                  <p className="text-[14px] leading-relaxed text-[#8a8371]">
                    {hasAnyKey
                      ? 'Your graded package will appear here — match score, dimension assay, and the three-reviewer panel.'
                      : 'Add an API key first (top right) — Gemini, Groq, or Cerebras — then paste a job description and run your first assay.'}
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
            Your resume and keys stay in this browser. Never uploaded anywhere
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
