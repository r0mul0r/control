'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Filter, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import NoveltyCard from '@/components/novelties/NoveltyCard'
import NoveltyForm from '@/components/novelties/NoveltyForm'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { NoveltyWithDetails, Profile, Shift } from '@/types/database'
import { canManageNovelties } from '@/lib/utils'

export default function NovedadesPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [novelties, setNovelties] = useState<NoveltyWithDetails[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterShift, setFilterShift] = useState('')
  const [search, setSearch] = useState('')

  const loadData = async () => {
    if (!profile) return

    const [shiftsRes, supervisorsRes] = await Promise.all([
      supabase.from('shifts').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'supervisor'),
    ])
    setShifts((shiftsRes.data as Shift[]) || [])
    setSupervisors((supervisorsRes.data as Profile[]) || [])

    const q = supabase
      .from('novelties')
      .select(`
        *,
        shift:shifts(*),
        supervisor:profiles!novelties_supervisor_id_fkey(*),
        received_from_supervisor:profiles!novelties_received_from_supervisor_id_fkey(*),
        novelty_operators(*, employee:employees(*, shift:shifts(*))),
        shift_changes(*, employee:employees(*), from_shift:shifts!shift_changes_from_shift_id_fkey(*), to_shift:shifts!shift_changes_to_shift_id_fkey(*))
      `)
      .order('received_at', { ascending: false })

    if (profile.role === 'supervisor' && profile.shift_id) {
      q.eq('shift_id', profile.shift_id)
    }

    const { data } = await q
    setNovelties((data || []) as NoveltyWithDetails[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [profile])

  const canCreate = profile ? canManageNovelties(profile.role) : false

  const filtered = novelties.filter(nov => {
    const matchShift = filterShift === '' || nov.shift_id === filterShift
    const matchSearch = search === '' ||
      nov.shift?.name?.toLowerCase().includes(search.toLowerCase()) ||
      nov.supervisor?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      nov.notes?.toLowerCase().includes(search.toLowerCase())
    return matchShift && matchSearch
  })

  const isSupervisor = profile?.role === 'supervisor'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Novedades</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {novelties.length} novedad{novelties.length !== 1 ? 'es' : ''} registrada{novelties.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              <span className="hidden sm:inline">Nueva novedad</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por turno, supervisor u observaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {!isSupervisor && (
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los turnos</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {/* Novelties grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-gray-300 dark:text-gray-600 mb-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search || filterShift ? 'Sin resultados' : 'No hay novedades registradas'}
            </p>
            {canCreate && !search && !filterShift && (
              <Button onClick={() => setModalOpen(true)} className="mt-4">
                <Plus size={16} /> Crear primera novedad
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(nov => (
              <NoveltyCard key={nov.id} novelty={nov} />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva novedad de turno"
        size="xl"
      >
        <NoveltyForm
          shifts={shifts}
          supervisors={[...supervisors, ...([profile].filter(p => p?.role === 'co_admin' || p?.role === 'admin') as Profile[])]}
          supervisorShiftId={isSupervisor ? profile?.shift_id || undefined : undefined}
          onSuccess={() => { setModalOpen(false); loadData() }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </DashboardLayout>
  )
}
