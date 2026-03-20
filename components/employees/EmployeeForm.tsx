'use client'

import { useState } from 'react'
import type { Employee, Shift } from '@/types/database'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface Props {
  employee?: Employee
  shifts: Shift[]
  onSuccess: () => void
  onCancel: () => void
}

export default function EmployeeForm({ employee, shifts, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    full_name: employee?.full_name || '',
    document_id: employee?.document_id || '',
    position: employee?.position || '',
    shift_id: employee?.shift_id || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = 'El nombre es requerido'
    if (!form.document_id.trim()) errs.document_id = 'El documento es requerido'
    if (!form.position.trim()) errs.position = 'El cargo es requerido'
    if (!form.shift_id) errs.shift_id = 'El turno es requerido'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      if (employee) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('employees') as any).update(form).eq('id', employee.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('employees') as any).insert(form)
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre completo"
        value={form.full_name}
        onChange={e => setForm({ ...form, full_name: e.target.value })}
        error={errors.full_name}
        placeholder="Juan Pérez"
      />
      <Input
        label="Número de documento"
        value={form.document_id}
        onChange={e => setForm({ ...form, document_id: e.target.value })}
        error={errors.document_id}
        placeholder="12345678"
      />
      <Select
        label="Cargo / Posición"
        value={form.position}
        onChange={e => setForm({ ...form, position: e.target.value })}
        error={errors.position}
        placeholder="Seleccionar cargo..."
        options={[
          { value: 'Operador en entrenamiento', label: 'Operador en entrenamiento' },
          { value: 'Operador básico', label: 'Operador básico' },
          { value: 'Operador intermedio', label: 'Operador intermedio' },
          { value: 'Operador avanzado', label: 'Operador avanzado' },
          { value: 'Operador administrativo', label: 'Operador administrativo' },
          { value: 'Operador administrativo en entrenamiento', label: 'Operador administrativo en entrenamiento' },
          { value: 'Supervisor de chats', label: 'Supervisor de chats' },
          { value: 'Supervisor en entrenamiento', label: 'Supervisor en entrenamiento' },
          { value: 'Supervisor', label: 'Supervisor' },
          { value: 'Supervisor general', label: 'Supervisor general' },
          { value: 'Supervisor master', label: 'Supervisor master' },
        ]}
      />
      <Select
        label="Turno"
        value={form.shift_id}
        onChange={e => setForm({ ...form, shift_id: e.target.value })}
        error={errors.shift_id}
        placeholder="Seleccionar turno..."
        options={shifts.map(s => ({ value: s.id, label: s.name }))}
      />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : employee ? 'Actualizar' : 'Registrar empleado'}
        </Button>
      </div>
    </form>
  )
}
