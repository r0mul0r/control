'use client'

import { useState } from 'react'
import type { Shift } from '@/types/database'
import { SHIFT_COLORS } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  shift?: Shift
  onSuccess: () => void
  onCancel: () => void
}

export default function ShiftForm({ shift, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: shift?.name || '',
    start_time: shift?.start_time || '',
    end_time: shift?.end_time || '',
    description: shift?.description || '',
    color: shift?.color || '#3B82F6',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido'
    if (!form.start_time) errs.start_time = 'La hora de inicio es requerida'
    if (!form.end_time) errs.end_time = 'La hora de fin es requerida'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      if (shift) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('shifts') as any).update(form).eq('id', shift.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('shifts') as any).insert(form)
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre del turno"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        error={errors.name}
        placeholder="Ej: Turno Mañana"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Hora inicio"
          type="time"
          value={form.start_time}
          onChange={e => setForm({ ...form, start_time: e.target.value })}
          error={errors.start_time}
        />
        <Input
          label="Hora fin"
          type="time"
          value={form.end_time}
          onChange={e => setForm({ ...form, end_time: e.target.value })}
          error={errors.end_time}
        />
      </div>
      <Textarea
        label="Descripción (opcional)"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción del turno..."
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {SHIFT_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setForm({ ...form, color: c.value })}
              title={c.label}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                form.color === c.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : shift ? 'Actualizar' : 'Crear turno'}
        </Button>
      </div>
    </form>
  )
}
