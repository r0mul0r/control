'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Clock, FileText, LogOut,
  Menu, X, ChevronRight, Shield, UserCheck
} from 'lucide-react'
import { cn, ROLE_LABELS } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'co_admin', 'supervisor', 'hr'],
  },
  {
    label: 'Turnos',
    href: '/turnos',
    icon: Clock,
    roles: ['admin', 'co_admin', 'hr'],
  },
  {
    label: 'Empleados',
    href: '/empleados',
    icon: Users,
    roles: ['admin', 'co_admin', 'hr', 'supervisor'],
  },
  {
    label: 'Novedades',
    href: '/novedades',
    icon: FileText,
    roles: ['admin', 'co_admin', 'supervisor', 'hr'],
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: Shield,
    roles: ['admin'],
  },
]

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  co_admin: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-green-100 text-green-700',
  hr: 'bg-orange-100 text-orange-700',
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (!profile) return null

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(profile.role))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <UserCheck size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">Control</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Turnos y Novedades</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile.full_name}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_COLORS[profile.role])}>
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Icon size={18} className={cn(active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} className="text-blue-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => signOut().then(() => router.replace('/login'))}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut size={18} className="group-hover:text-red-500 transition-colors" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <UserCheck size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Control</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent />
      </div>
    </>
  )
}
