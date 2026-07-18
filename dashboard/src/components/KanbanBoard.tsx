import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'
import JobCard from './JobCard'
import type { JobRecord } from '../api/jobs'

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

interface KanbanBoardProps {
  jobs: JobRecord[]
  onStatusChange: (jobId: string, newStatus: JobStatus) => Promise<void>
}

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: 'saved', label: 'Saved', color: 'bg-slate-100 border-slate-300' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-50 border-blue-200' },
  { id: 'interview', label: 'Interview', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'offer', label: 'Offer', color: 'bg-green-50 border-green-200' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200' },
]

export const KanbanBoard = ({ jobs, onStatusChange }: KanbanBoardProps) => {
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const job = jobs.find((j) => j.id === active.id)
    if (job) {
      setActiveJob(job)
      setIsDragging(true)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)
    setIsDragging(false)

    if (!over) return

    const jobId = active.id as string
    const newStatus = over.id as JobStatus

    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === newStatus) return

    await onStatusChange(jobId, newStatus)
  }

  const getJobsForColumn = (status: JobStatus) => {
    return jobs.filter((job) => job.status === status)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            jobs={getJobsForColumn(column.id)}
            isDragging={isDragging}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob && isDragging ? (
          <div className="rotate-3 scale-105 opacity-80">
            <JobCard job={activeJob} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}