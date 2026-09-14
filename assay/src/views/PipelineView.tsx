import TrackerStats from '../components/TrackerStats'
import HistoryPanel from '../components/HistoryPanel'
import type { AppStatus, SavedAssay } from '../lib/storage'

interface PipelineViewProps {
  items: SavedAssay[]
  activeId: string | null
  onOpen: (item: SavedAssay) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: AppStatus) => void
}

export default function PipelineView({
  items,
  activeId,
  onOpen,
  onDelete,
  onStatusChange,
}: PipelineViewProps) {
  return (
    <>
      <section className="max-w-3xl pt-10 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="mt-2 text-[14px] text-[#6f6858]">
          Every application you've assayed, with its status.
        </p>
      </section>

      <section className="flex max-w-3xl flex-col gap-6 pb-16">
        <TrackerStats items={items} />
        <HistoryPanel
          items={items}
          activeId={activeId}
          onOpen={onOpen}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      </section>
    </>
  )
}
