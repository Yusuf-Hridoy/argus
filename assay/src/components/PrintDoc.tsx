import { renderMarkdown } from '../lib/markdown'

/**
 * Print-only document root: hidden on screen, the only visible content when
 * printing. Renders the bare-element ('print') markdown variant so the
 * #print-root stylesheet in index.css is the sole source of styling —
 * no app UI, colors, or Tailwind classes reach the PDF.
 */
export default function PrintDoc({ markdown }: { markdown: string }) {
  return (
    <div id="print-root" aria-hidden="true">
      {renderMarkdown(markdown, 'print')}
    </div>
  )
}
