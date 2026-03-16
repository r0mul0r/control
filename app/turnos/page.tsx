'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ShiftCard from '@/components/shifts/ShiftCard'
import ShiftForm from '@/components/shifts/ShiftForm'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Shift } from '@/types/database'
import { canManageShifts } from '@/lib/utils'

export default function TurnosPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<Shift | null>(null)

  const loadShifts = async () => {
    const { data } = await supabase.from('shifts').select('*').order('name')
    setShifts((data as Shift[]) || [])

    // Get employee counts per shift
    if (data && (data as Shift[]).length > 0) {
      const counts: Record<string, number> = {}
      await Promise.all(
        (data as Shift[]).map(async (shift) => {
          const { count } = await supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('shift_id', shift.id)
            .eq('is_active', true)
          counts[shift.id] = count || 0
        })
      )
      setEmployeeCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { loadShifts() }, [])

  const handleDelete = async (shift: Shift) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('shifts') as any).delete().eq('id', shift.id)
    setDeleteConfirm(null)
    loadShifts()
  }

  const canEdit = profile ? canManageShifts(profile.role) : false

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Turnos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {shifts.length} turno{shifts.length !== 1 ? 's' : ''} registrado{shifts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => { setEditingShift(undefined); setModalOpen(true) }} className="gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">Nuevo turno</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-300 dark:text-gray-600 mb-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay turnos registrados</p>
            {canEdit && (
              <Button onClick={() => setModalOpen(true)} className="mt-4">
                <Plus size={16} /> Crear primer turno
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shifts.map(shift => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                employeeCount={employeeCounts[shift.id]}
                canEdit={canEdit}
                onEdit={() => { setEditingShift(shift); setModalOpen(true) }}
                onDelete={() => setDeleteConfirm(shift)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingShift(undefined) }}
        title={editingShift ? 'Editar turno' : 'Nuevo turno'}
      >
        <ShiftForm
          shift={editingShift}
          onSuccess={() => { setModalOpen(false); setEditingShift(undefined); loadShifts() }}
          onCancel={() => { setModalOpen(false); setEditingShift(undefined) }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar turno"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de eliminar el turno <strong>{deleteConfirm?.name}</strong>?
            Esta acción no se puede deshacer y podría fallar si hay empleados asignados.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1">
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
