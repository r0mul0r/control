'use client'

import { Clock, Pencil, Trash2, Users } from 'lucide-react'
import type { Shift } from '@/types/database'
import { formatTime } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface Props {
  shift: Shift
  employeeCount?: number
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function ShiftCard({ shift, employeeCount = 0, canEdit, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="h-2" style={{ backgroundColor: shift.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{shift.name}</h3>
            {shift.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{shift.description}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={onEdit} className="p-1.5">
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: shift.color }} />
            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {employeeCount} operadores
          </span>
        </div>
      </div>
    </div>
  )
}
