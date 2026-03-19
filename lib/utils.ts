import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { UserRole } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  co_admin: 'Co-Administrador',
  supervisor: 'Supervisor',
  hr: 'Recursos Humanos',
}

export const SHIFT_COLORS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Amarillo' },
  { value: '#EF4444', label: 'Rojo' },
  { value: '#8B5CF6', label: 'Morado' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#06B6D4', label: 'Cian' },
  { value: '#F97316', label: 'Naranja' },
]

export function canManageShifts(role: UserRole) {
  return role === 'admin'
}

export function canManageEmployees(role: UserRole) {
  return ['admin', 'co_admin'].includes(role)
}

export function canViewAllData(role: UserRole) {
  return ['admin', 'co_admin', 'hr'].includes(role)
}

export function canManageNovelties(role: UserRole) {
  return ['admin', 'co_admin', 'supervisor'].includes(role)
}
