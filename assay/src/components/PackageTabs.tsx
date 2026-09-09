import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import type { AssayResult } from '../types/assay'

type Tab = 'cv' | 'letter' | 'answers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'cv', label: 'Tailored CV' },
  { id: 'letter', label: 'Cover letter' },
  { id: 'answers', label: 'Form answers' },
]

function formatAnswers(result: AssayResult) {
  return result.formAnswers
    .map((f) => `Q: ${f.question}\n\n${f.answer}`)
    .join('\n\n---\n\n')
}

function bundleMarkdown(result: AssayResult) {
  return [
    `# Application package — ${result.roleTitle} @ ${result.company}`,
    '',
    `Score: ${result.overallScore}/100 — ${result.verdict}`,
    '',
    '---',
    '',
    '## Tailored CV',
    '',
    result.tailoredCv,
    '',
    '---',
    '',
    '## Cover letter',
    '',
    result.coverLetter,
    '',
    '---',
    '',
    '## Form answers',
    '',
    formatAnswers(result),
    '',
  ].join('\n')
}

export default function PackageTabs({ result }: { result: AssayResult }) {
  const [tab, setTab] = useState<Tab>('cv')
  const [copied, setCopied] = useState(false)

  const currentText = () => {
    if (tab === 'cv') return result.tailoredCv
    if (tab === 'letter') return result.coverLetter
    return formatAnswers(result)
  }

  const onCopy = async () => {
    await navigator.clipboard.writeText(currentText())
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const onDownload = () => {
    const slug = result.company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const blob = new Blob([bundleMarkdown(result)], {
      type: 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `application-${slug || 'package'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionClass =
    'flex items-center gap-1.5 rounded-md border border-[#d8d1bf] bg-[#faf7f0] px-3 py-1.5 text-[13px] text-[#26221b] transition-colors hover:bg-[#f0ebdd]'

  return (
    <div className="overflow-hidden rounded-xl border border-[#d8d1bf] bg-[#faf7f0] shadow-[0_1px_2px_rgba(40,35,25,0.06),0_8px_24px_rgba(40,35,25,0.06)]">
      {/* TAB BAR */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-[#e2dccb] px-4 py-2">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                tab === t.id
                  ? 'bg-[#26221b] font-medium text-[#f4f0e4]'
                  : 'text-[#6f6858] hover:bg-[#f0ebdd]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCopy} className={actionClass}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#3d5a2e]" />
                <span className="text-[#3d5a2e]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button type="button" onClick={onDownload} className={actionClass}>
            <Download className="h-3.5 w-3.5" />
            .md
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-h-[560px] overflow-y-auto px-6 py-5">
        {tab === 'answers' ? (
          <div className="flex flex-col">
            {result.formAnswers.map((f, i) => (
              <div
                key={i}
                className={i > 0 ? 'border-t border-[#e2dccb] pt-4 mt-4' : ''}
              >
                <p className="text-[14px] font-bold">{f.question}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#4a4436]">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-[#3a352c]">
            {currentText()}
          </pre>
        )}
      </div>
    </div>
  )
}
