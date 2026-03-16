'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Eye, EyeOff } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <UserCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Control</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de Turnos y Novedades</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@empresa.com"
              autoComplete="email"
              required
            />
            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-7 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Contacta al administrador si no puedes acceder
        </p>
      </div>
    </div>
  )
}
