'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, UserX, UserCheck2, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import EmployeeForm from '@/components/employees/EmployeeForm'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import type { Employee, Shift } from '@/types/database'
import { canManageEmployees } from '@/lib/utils'

type EmployeeWithShift = Employee & { shift: Shift }

export default function EmpleadosPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [employees, setEmployees] = useState<EmployeeWithShift[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>()
  const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const loadData = async () => {
    try {
      const [empsRes, shiftsRes] = await Promise.all([
        supabase.from('employees').select('*, shift:shifts(*)').order('full_name'),
        supabase.from('shifts').select('*').order('name'),
      ])
      setEmployees((empsRes.data as EmployeeWithShift[]) || [])
      setShifts((shiftsRes.data as Shift[]) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleToggleActive = async (emp: Employee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('employees') as any).update({ is_active: !emp.is_active }).eq('id', emp.id)
    setConfirmDeactivate(null)
    loadData()
  }

  const canEdit = profile ? canManageEmployees(profile.role) : false

  const resetPage = () => setPage(1)

  const filtered = employees.filter(emp => {
    const matchSearch = search === '' ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.document_id.includes(search) ||
      emp.position.toLowerCase().includes(search.toLowerCase())
    const matchShift = filterShift === '' || emp.shift_id === filterShift
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && emp.is_active) ||
      (filterActive === 'inactive' && !emp.is_active)
    return matchSearch && matchShift && matchActive
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Empleados</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {employees.filter(e => e.is_active).length} activo{employees.filter(e => e.is_active).length !== 1 ? 's' : ''}
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => { setEditingEmployee(undefined); setModalOpen(true) }}>
              <Plus size={16} />
              <span className="hidden sm:inline">Registrar empleado</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o cargo..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterShift}
            onChange={e => { setFilterShift(e.target.value); resetPage() }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los turnos</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(['active', 'inactive', 'all'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setFilterActive(v); resetPage() }}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filterActive === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                {v === 'active' ? 'Activos' : v === 'inactive' ? 'Inactivos' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <UserCheck2 size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              {search || filterShift ? 'Sin resultados para tu búsqueda' : 'No hay empleados registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empleado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Documento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turno</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                    {canEdit && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginated.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {emp.full_name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{emp.document_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{emp.position}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: emp.shift?.color || '#6B7280' }}
                        >
                          {emp.shift?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.is_active ? 'success' : 'danger'}>
                          {emp.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingEmployee(emp); setModalOpen(true) }} className="p-1.5">
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmDeactivate(emp)}
                              className={`p-1.5 ${emp.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            >
                              {emp.is_active ? <UserX size={14} /> : <UserCheck2 size={14} />}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {paginated.map(emp => (
                <div key={emp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.document_id} · {emp.position}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingEmployee(emp); setModalOpen(true) }} className="p-1.5">
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setConfirmDeactivate(emp)}
                          className={`p-1.5 ${emp.is_active ? 'text-red-500' : 'text-green-600'}`}
                        >
                          {emp.is_active ? <UserX size={13} /> : <UserCheck2 size={13} />}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: emp.shift?.color || '#6B7280' }}
                    >
                      {emp.shift?.name}
                    </span>
                    <Badge variant={emp.is_active ? 'success' : 'danger'}>
                      {emp.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        p === page
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmployee(undefined) }}
        title={editingEmployee ? 'Editar empleado' : 'Registrar empleado'}
      >
        <EmployeeForm
          employee={editingEmployee}
          shifts={shifts}
          onSuccess={() => { setModalOpen(false); setEditingEmployee(undefined); loadData() }}
          onCancel={() => { setModalOpen(false); setEditingEmployee(undefined) }}
        />
      </Modal>

      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={confirmDeactivate?.is_active ? 'Desactivar empleado' : 'Activar empleado'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿{confirmDeactivate?.is_active ? 'Desactivar' : 'Activar'} al empleado <strong>{confirmDeactivate?.full_name}</strong>?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirmDeactivate(null)} className="flex-1">Cancelar</Button>
            <Button
              variant={confirmDeactivate?.is_active ? 'danger' : 'primary'}
              onClick={() => confirmDeactivate && handleToggleActive(confirmDeactivate)}
              className="flex-1"
            >
              {confirmDeactivate?.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
