'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Shift, UserRole } from '@/types/database'
import { ROLE_LABELS } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type ProfileWithShift = Profile & { shift: Shift | null }

export default function UsuariosPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<ProfileWithShift[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileWithShift | null>(null)
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'supervisor' as UserRole, shift_id: '' })
  const [editForm, setEditForm] = useState({ full_name: '', role: 'supervisor' as UserRole, shift_id: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [profile])

  const loadData = async () => {
    const [usersRes, shiftsRes] = await Promise.all([
      supabase.from('profiles').select('*, shift:shifts(*)').order('full_name'),
      supabase.from('shifts').select('*').order('name'),
    ])
    setUsers((usersRes.data as ProfileWithShift[]) || [])
    setShifts((shiftsRes.data as Shift[]) || [])
    setLoading(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: createForm.email,
      password: createForm.password,
      options: {
        data: {
          full_name: createForm.full_name,
          role: createForm.role,
        }
      }
    })

    if (signUpError) {
      setFormError(signUpError.message)
      setSaving(false)
      return
    }

    // Update profile with shift if needed
    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).update({
        shift_id: createForm.shift_id || null,
        role: createForm.role,
        full_name: createForm.full_name,
      }).eq('id', data.user.id)
    }

    setModalOpen(false)
    setCreateForm({ email: '', password: '', full_name: '', role: 'supervisor', shift_id: '' })
    loadData()
    setSaving(false)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setFormError('')
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({
      full_name: editForm.full_name,
      role: editForm.role,
      shift_id: editForm.shift_id || null,
    }).eq('id', editingUser.id)

    if (error) { setFormError(error.message); setSaving(false); return }

    setEditingUser(null)
    loadData()
    setSaving(false)
  }

  const ROLE_BADGE: Record<UserRole, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
    admin: 'danger',
    co_admin: 'info',
    supervisor: 'success',
    hr: 'warning',
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))
  const shiftOptions = shifts.map(s => ({ value: s.id, label: s.name }))

  if (profile?.role !== 'admin') return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{users.length} usuarios registrados</p>
          </div>
          <Button onClick={() => { setModalOpen(true); setFormError('') }}>
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo usuario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Usuario', 'Email', 'Rol', 'Turno', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {u.full_name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.shift ? (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: u.shift.color }}>
                            {u.shift.name}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingUser(u)
                          setEditForm({ full_name: u.full_name, role: u.role, shift_id: u.shift_id || '' })
                          setFormError('')
                        }} className="p-1.5">
                          <Pencil size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingUser(u)
                      setEditForm({ full_name: u.full_name, role: u.role, shift_id: u.shift_id || '' })
                    }} className="p-1.5">
                      <Pencil size={13} />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    {u.shift && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: u.shift.color }}>
                        {u.shift.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create user modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Crear nuevo usuario">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Nombre completo" value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} required />
          <Input label="Correo electrónico" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
          <Input label="Contraseña" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required helperText="Mínimo 6 caracteres" />
          <Select label="Rol" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value as UserRole })} options={roleOptions} />
          <Select label="Turno asignado" value={createForm.shift_id} onChange={e => setCreateForm({ ...createForm, shift_id: e.target.value })} placeholder="Sin turno asignado" options={shiftOptions} />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creando...' : 'Crear usuario'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar usuario">
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input label="Nombre completo" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
          <Select label="Rol" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })} options={roleOptions} />
          <Select label="Turno asignado" value={editForm.shift_id} onChange={e => setEditForm({ ...editForm, shift_id: e.target.value })} placeholder="Sin turno asignado" options={shiftOptions} />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
