import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { JobRecord } from '../api/jobs'

interface KanbanCardProps {
  job: JobRecord
  isDragging?: boolean
}

export const KanbanCard = ({ job, isDragging }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isSorting,
  } = useSortable({
    id: job.id,
    data: {
      type: 'job',
      job,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.5 : 1,
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const getSourceIcon = (sourceMethod?: string) => {
    switch (sourceMethod) {
      case 'extension':
        return '🌐'
      case 'whatsapp':
        return '💬'
      default:
        return '📋'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border border-slate-200 p-4 cursor-grab
        hover:shadow-md hover:border-slate-300 transition-all
        active:cursor-grabbing
        ${isDragging ? 'shadow-lg border-blue-300' : ''}
      `}
    >
      {/* Header: Title + Source Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
          {job.title || 'Untitled Job'}
        </h4>
        <span className="text-lg flex-shrink-0" title={job.source_method || 'manual'}>
          {getSourceIcon(job.source_method)}
        </span>
      </div>

      {/* Company */}
      <p className="text-sm text-slate-600 mb-2 truncate">
        {job.company || 'Unknown Company'}
      </p>

      {/* Location + Salary */}
      <div className="space-y-1 mb-3 text-xs text-slate-500">
        {(job.location && job.location !== 'N/A') && (
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {(job.salary && job.salary !== 'N/A') && (
          <div className="flex items-center gap-1">
            <span>💰</span>
            <span className="truncate">{job.salary}</span>
          </div>
        )}
      </div>

      {/* Stack Badges */}
      {job.stack && job.stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.stack.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
            >
              {skill}
            </span>
          ))}
          {job.stack.length > 3 && (
            <span className="text-xs text-slate-500 px-2 py-0.5">
              +{job.stack.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Date */}
      <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
        {formatDate(job.created_at)}
      </div>
    </div>
  )
}