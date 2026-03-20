'use client'

import { useState } from 'react'
import { Calendar, Clock, User, Users, ArrowLeftRight, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { NoveltyWithDetails } from '@/types/database'
import { formatDateTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

interface Props {
  novelty: NoveltyWithDetails
}

export default function NoveltyCard({ novelty }: Props) {
  const [expanded, setExpanded] = useState(false)

  const presentOperators = novelty.novelty_operators.filter(o => o.is_present)
  const absentOperators = novelty.novelty_operators.filter(o => !o.is_present)
  const shiftChanges = novelty.shift_changes

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Shift color bar */}
      <div className="h-1.5" style={{ backgroundColor: novelty.shift?.color || '#3B82F6' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: novelty.shift?.color || '#3B82F6' }}
              >
                {novelty.shift?.name}
              </span>
              {shiftChanges.length > 0 && (
                <Badge variant="warning">{shiftChanges.length} cambio{shiftChanges.length !== 1 ? 's' : ''}</Badge>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Calendar size={12} />
              <span>{formatDateTime(novelty.received_at)}</span>
            </div>
          </div>
        </div>

        {/* Supervisor info */}
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User size={14} className="text-blue-500 shrink-0" />
            <span className="text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">Supervisor: </span>
              {novelty.supervisor?.full_name}
            </span>
          </div>

          {/* Received from */}
          {(novelty.received_from_supervisor || novelty.handover_operators?.filter(o => o.direction === 'received_from').length > 0) && (
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <ArrowLeftRight size={14} className="text-green-500 shrink-0 mt-0.5" />
              <span className="text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">Recibí de: </span>
                {[
                  novelty.received_from_supervisor?.full_name,
                  ...((novelty.handover_operators ?? []).filter(o => o.direction === 'received_from').map(o => o.employee?.full_name)),
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Handed to */}
          {(novelty.handed_to_supervisor || novelty.handover_operators?.filter(o => o.direction === 'handed_to').length > 0) && (
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <ArrowLeftRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">Entregué a: </span>
                {[
                  novelty.handed_to_supervisor?.full_name,
                  ...((novelty.handover_operators ?? []).filter(o => o.direction === 'handed_to').map(o => o.employee?.full_name)),
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Operators summary */}
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Users size={13} />
            {presentOperators.length} presentes
          </span>
          {absentOperators.length > 0 && (
            <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
              <Users size={13} />
              {absentOperators.length} ausentes
            </span>
          )}
        </div>

        {/* Notes preview */}
        {novelty.notes && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
            &ldquo;{novelty.notes}&rdquo;
          </p>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ocultar detalles' : 'Ver detalles completos'}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* All operators */}
            {novelty.novelty_operators.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Users size={13} /> Operadores del turno
                </p>
                <div className="space-y-1">
                  {novelty.novelty_operators.map(op => (
                    <div key={op.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{op.employee?.full_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{op.employee?.position}</span>
                        <Badge variant={op.is_present ? 'success' : 'danger'}>
                          {op.is_present ? 'Presente' : 'Ausente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shift changes */}
            {shiftChanges.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <ArrowLeftRight size={13} /> Cambios de turno
                </p>
                <div className="space-y-1">
                  {shiftChanges.map(sc => (
                    <div key={sc.id} className="text-xs py-2 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-amber-800 dark:text-amber-300">{sc.employee?.full_name}</span>
                        <span className="text-gray-500">·</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-white text-xs"
                          style={{ backgroundColor: sc.from_shift?.color }}
                        >
                          {sc.from_shift?.name}
                        </span>
                        <ArrowLeftRight size={10} className="text-gray-400" />
                        <span
                          className="px-1.5 py-0.5 rounded text-white text-xs"
                          style={{ backgroundColor: sc.to_shift?.color }}
                        >
                          {sc.to_shift?.name}
                        </span>
                      </div>
                      {sc.reason && (
                        <p className="text-gray-500 dark:text-gray-400 mt-1 italic">{sc.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {novelty.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <FileText size={13} /> Observaciones
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                  {novelty.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
