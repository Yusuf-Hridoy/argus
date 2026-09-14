import { useEffect } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import ScoreCard from '../components/ScoreCard'
import PackageTabs from '../components/PackageTabs'
import PrepCard from '../components/PrepCard'
import NotesCard from '../components/NotesCard'
import StatusPill from '../components/StatusPill'
import RerunDiff, { type RerunDiff as RerunDiffData } from '../components/RerunDiff'
import { navigate } from '../lib/router'
import type { ProviderId } from '../lib/providers'
import { cardClass, microLabel } from '../lib/ui'
import type { AppStatus, SavedAssay } from '../lib/storage'
import type { InterviewPrep } from '../types/assay'

// Mirrors ScoreCard's private VERDICT_STYLES (kept in sync deliberately —
// this phase forbids component refactors, so the record is duplicated here
// for the detail header badge rather than re-exported).
const VERDICT_STYLES: Record<string, string> = {
  'STRONG MATCH': 'bg-[#e3ecda] text-[#3d5a2e] border-[#b9cba6]',
  'GOOD MATCH': 'bg-[#e9efdc] text-[#5a6428] border-[#cdd6a8]',
  'PARTIAL MATCH': 'bg-[#f3e8d3] text-[#8a5a1d] border-[#e0c795]',
  'WEAK MATCH': 'bg-[#f3ddd3] text-[#9c3d1e] border-[#e3b39d]',
}

interface AppDetailViewProps {
  assay: SavedAssay | null
  loading: boolean
  loadingStage: string
  resume: string
  activeProvider: ProviderId
  keys: Partial<Record<ProviderId, string>>
  rerunDiff: RerunDiffData | null
  onRerun: (base: SavedAssay) => void
  onStatusChange: (id: string, status: AppStatus) => void
  onPrepSaved: (id: string, prep: InterviewPrep) => void
  onNotesSave: (id: string, notes: string) => void
}

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

export default function AppDetailView({
  assay,
  loading,
  loadingStage,
  resume,
  activeProvider,
  keys,
  rerunDiff,
  onRerun,
  onStatusChange,
  onPrepSaved,
  onNotesSave,
}: AppDetailViewProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [assay?.id])

  if (!assay) {
    return (
      <section className="max-w-3xl pt-10 pb-16">
        <BackLink />
        <p className="mt-6 text-[14px] text-[#8a8371]">
          This assay no longer exists.
        </p>
      </section>
    )
  }

  return (
    <>
      <section className="max-w-3xl pt-10 pb-6">
        <BackLink />
      </section>

      <section className="flex max-w-3xl flex-col gap-6 pb-16">
        {/* HEADER CARD */}
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2 px-5 pt-4">
            <span className={microLabel}>Application</span>
            <span className={microLabel}>{relativeDate(assay.createdAt)}</span>
          </div>
          <div className="px-5 pb-5">
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {assay.result.roleTitle}
            </h1>
            <p className="mt-1 text-[14px] text-[#6f6858]">
              {assay.result.company}
              {assay.result.companyContext
                ? ` · ${assay.result.companyContext}`
                : ''}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span
                  className={`inline-block rounded-md border px-3 py-1 font-mono text-[11px] tracking-[0.14em] ${VERDICT_STYLES[assay.result.verdict] ?? VERDICT_STYLES['PARTIAL MATCH']}`}
                >
                  {assay.result.verdict}
                </span>
                <span className="text-5xl font-bold tracking-tighter tabular-nums">
                  {assay.result.overallScore}
                  <span className="align-baseline text-xl text-[#9a937f]">
                    /100
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill
                  status={assay.status}
                  onChange={(s) => onStatusChange(assay.id, s)}
                />
                <button
                  type="button"
                  onClick={() => onRerun(assay)}
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
              </div>
            </div>
          </div>
        </div>

        {rerunDiff && !loading && <RerunDiff diff={rerunDiff} />}

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
        ) : (
          <>
            <ScoreCard result={assay.result} />
            <PackageTabs result={assay.result} />
            <PrepCard
              key={assay.id}
              assay={assay}
              resume={resume}
              activeProvider={activeProvider}
              keys={keys}
              onPrepSaved={onPrepSaved}
            />
            <NotesCard
              key={assay.id}
              assay={assay}
              onSave={onNotesSave}
            />
          </>
        )}
      </section>
    </>
  )
}

function BackLink() {
  return (
    <button
      type="button"
      onClick={() => navigate({ view: 'pipeline' })}
      className="flex items-center gap-1 text-[12.5px] text-[#8a8371] transition-colors hover:text-[#26221b]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Pipeline
    </button>
  )
}
