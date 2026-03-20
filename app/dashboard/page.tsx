'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import type { Shift, Employee, Novelty } from '@/types/database'
import { Clock, Users, FileText, ArrowLeftRight, Calendar } from 'lucide-react'
import { formatDateTime, ROLE_LABELS } from '@/lib/utils'
import Link from 'next/link'

interface Stats {
  shifts: number
  employees: number
  novelties: number
  shiftChanges: number
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ shifts: 0, employees: 0, novelties: 0, shiftChanges: 0 })
  const [recentNovelties, setRecentNovelties] = useState<(Novelty & { shift: Shift })[]>([])
  const [myShift, setMyShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    const load = async () => {
      const [shiftsRes, employeesRes, novRes] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact', head: true }),
        profile.role === 'supervisor'
          ? supabase.from('employees').select('id', { count: 'exact', head: true }).eq('shift_id', profile.shift_id || '')
          : supabase.from('employees').select('id', { count: 'exact', head: true }),
        profile.role === 'supervisor'
          ? supabase.from('novelties').select('id', { count: 'exact', head: true }).eq('shift_id', profile.shift_id || '')
          : supabase.from('novelties').select('id', { count: 'exact', head: true }),
      ])

      const changesRes = await supabase.from('shift_changes').select('id', { count: 'exact', head: true })

      setStats({
        shifts: shiftsRes.count || 0,
        employees: employeesRes.count || 0,
        novelties: novRes.count || 0,
        shiftChanges: changesRes.count || 0,
      })

      // Recent novelties
      const q = supabase
        .from('novelties')
        .select('*, shift:shifts(*)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (profile.role === 'supervisor') {
        q.eq('shift_id', profile.shift_id || '')
      }

      const { data: novData } = await q
      setRecentNovelties((novData || []) as (Novelty & { shift: Shift })[])

      // My shift
      if (profile.shift_id) {
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', profile.shift_id)
          .single()
        setMyShift(shiftData as Shift | null)
      }

      setLoading(false)
    }

    load()
  }, [profile])

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Not authenticated → go to login
  if (!user) {
    router.replace('/login')
    return null
  }

  // Authenticated but no profile → show error (avoids loop with middleware)
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Perfil no configurado</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Tu cuenta existe pero no tiene un perfil asignado. Contacta al administrador.
          </p>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))}
            className="text-sm text-blue-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Turnos registrados',
      value: stats.shifts,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/turnos',
      visible: ['admin', 'co_admin', 'hr'].includes(profile.role),
    },
    {
      label: profile.role === 'supervisor' ? 'Operadores en mi turno' : 'Empleados registrados',
      value: stats.employees,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      href: '/empleados',
      visible: true,
    },
    {
      label: 'Novedades',
      value: stats.novelties,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      href: '/novedades',
      visible: true,
    },
    {
      label: 'Cambios de turno',
      value: stats.shiftChanges,
      icon: ArrowLeftRight,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      href: '/novedades',
      visible: true,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bienvenido, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {ROLE_LABELS[profile.role]}
            {myShift && ` · ${myShift.name}`}
          </p>
        </div>

        {/* My shift banner */}
        {myShift && (
          <div
            className="rounded-xl p-4 text-white"
            style={{ backgroundColor: myShift.color }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="font-semibold text-lg">{myShift.name}</p>
                <p className="text-sm text-white/80">
                  {myShift.description || 'Tu turno asignado'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.filter(c => c.visible).map(card => {
              const Icon = card.icon
              return (
                <Link key={card.label} href={card.href}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                      <Icon size={20} className={card.color} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Recent novelties */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar size={17} />
              Novedades recientes
            </h2>
            <Link href="/novedades" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>

          {recentNovelties.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay novedades registradas aún</p>
              {['supervisor', 'co_admin', 'admin'].includes(profile.role) && (
                <Link href="/novedades" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  Crear primera novedad
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentNovelties.map(nov => (
                <Link key={nov.id} href="/novedades">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: nov.shift?.color || '#3B82F6' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {nov.shift?.name || 'Turno'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(nov.received_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
