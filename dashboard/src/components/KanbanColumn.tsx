import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import type { JobRecord } from '../api/jobs'

interface KanbanColumnProps {
  id: string
  label: string
  color: string
  jobs: JobRecord[]
  isDragging: boolean
}

export const KanbanColumn = ({ id, label, color, jobs, isDragging }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className={`rounded-t-xl border-2 border-b-0 ${color} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{label}</h3>
          <span className="text-sm font-medium text-slate-600 bg-white/50 px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </div>
      </div>

      {/* Column Body - Droppable Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-xl border-2 border-t-0 ${color} p-3 transition-colors ${
          isOver ? 'ring-2 ring-blue-400 ring-inset' : ''
        } ${isDragging ? 'bg-slate-50/50' : ''}`}
      >
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {jobs.length === 0 && !isDragging && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No jobs
              </div>
            )}
            {jobs.map((job) => (
              <KanbanCard key={job.id} job={job} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}