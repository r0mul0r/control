'use client'

import { useState, useEffect } from 'react'
import type { Employee, Profile, Shift } from '@/types/database'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeftRight, Users, ArrowDown, ArrowUp } from 'lucide-react'

interface ShiftChangeEntry {
  employee_id: string
  to_shift_id: string
  reason: string
  enabled: boolean
}

interface Props {
  shifts: Shift[]
  supervisors: Profile[]
  onSuccess: () => void
  onCancel: () => void
  supervisorShiftId?: string
}

function EmployeePicker({
  employees,
  selected,
  onChange,
  max = 3,
}: {
  employees: Employee[]
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else if (selected.length < max) {
      onChange([...selected, id])
    }
  }

  if (employees.length === 0) {
    return <p className="text-xs text-gray-400 italic">Sin operadores disponibles</p>
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        {employees.map(emp => {
          const isSelected = selected.includes(emp.id)
          const isDisabled = !isSelected && selected.length >= max
          return (
            <button
              key={emp.id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggle(emp.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : isDisabled
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300'
              }`}
            >
              {emp.full_name}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {selected.length}/{max} seleccionado{selected.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default function NoveltyForm({ shifts, supervisors, onSuccess, onCancel, supervisorShiftId }: Props) {
  const { profile } = useAuth()
  const supabase = createClient()

  const [form, setForm] = useState({
    shift_id: supervisorShiftId || '',
    received_from_supervisor_id: '',
    handed_to_supervisor_id: '',
    received_at: new Date().toISOString().slice(0, 16),
    notes: '',
  })
  const [receivedFromOperators, setReceivedFromOperators] = useState<string[]>([])
  const [handedToOperators, setHandedToOperators] = useState<string[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [shiftEmployees, setShiftEmployees] = useState<Employee[]>([])
  const [operatorPresence, setOperatorPresence] = useState<Record<string, boolean>>({})
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load all employees for handover pickers
  useEffect(() => {
    supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setAllEmployees((data as Employee[]) || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load shift employees when shift changes
  useEffect(() => {
    if (!form.shift_id) {
      setShiftEmployees([])
      setOperatorPresence({})
      setShiftChanges([])
      return
    }
    setLoadingEmployees(true)
    supabase
      .from('employees')
      .select('*')
      .eq('shift_id', form.shift_id)
      .eq('is_active', true)
      .then(({ data }) => {
        const emps = (data as Employee[]) || []
        setShiftEmployees(emps)
        const presence: Record<string, boolean> = {}
        emps.forEach(e => { presence[e.id] = true })
        setOperatorPresence(presence)
        setLoadingEmployees(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shift_id])

  const toggleEmployeeChange = (emp: Employee) => {
    const exists = shiftChanges.find(sc => sc.employee_id === emp.id && sc.enabled)
    if (exists) {
      setShiftChanges(prev => prev.filter(sc => sc.employee_id !== emp.id))
    } else {
      setShiftChanges(prev => [
        ...prev.filter(sc => sc.employee_id !== emp.id),
        { employee_id: emp.id, to_shift_id: '', reason: '', enabled: true }
      ])
    }
  }

  const updateShiftChange = (employee_id: string, field: 'to_shift_id' | 'reason', value: string) => {
    setShiftChanges(prev => prev.map(sc =>
      sc.employee_id === employee_id ? { ...sc, [field]: value } : sc
    ))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.shift_id) errs.shift_id = 'El turno es requerido'
    if (!form.received_at) errs.received_at = 'La fecha y hora son requeridas'
    const invalidChanges = shiftChanges.filter(sc => sc.enabled && !sc.to_shift_id)
    if (invalidChanges.length > 0) errs.shift_changes = 'Selecciona el turno de destino para los cambios'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)

    try {
      const supervisorId = profile!.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: novelty, error: novErr } = await (supabase.from('novelties') as any)
        .insert({
          shift_id: form.shift_id,
          supervisor_id: supervisorId,
          received_from_supervisor_id: form.received_from_supervisor_id || null,
          handed_to_supervisor_id: form.handed_to_supervisor_id || null,
          received_at: new Date(form.received_at).toISOString(),
          notes: form.notes || null,
        })
        .select()
        .single()

      if (novErr) throw novErr

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noveltyData = novelty as any

      // Insert novelty operators (shift presence)
      if (shiftEmployees.length > 0) {
        await supabase.from('novelty_operators').insert(
          shiftEmployees.map(emp => ({
            novelty_id: noveltyData.id,
            employee_id: emp.id,
            is_present: operatorPresence[emp.id] ?? true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any
        )
      }

      // Insert shift changes
      const activeChanges = shiftChanges.filter(sc => sc.enabled && sc.to_shift_id)
      if (activeChanges.length > 0) {
        await supabase.from('shift_changes').insert(
          activeChanges.map(sc => ({
            novelty_id: noveltyData.id,
            employee_id: sc.employee_id,
            from_shift_id: form.shift_id,
            to_shift_id: sc.to_shift_id,
            reason: sc.reason || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any
        )
      }

      // Insert handover operators
      const handoverRows = [
        ...receivedFromOperators.map(emp_id => ({
          novelty_id: noveltyData.id,
          employee_id: emp_id,
          direction: 'received_from' as const,
        })),
        ...handedToOperators.map(emp_id => ({
          novelty_id: noveltyData.id,
          employee_id: emp_id,
          direction: 'handed_to' as const,
        })),
      ]
      if (handoverRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('novelty_handover_operators') as any).insert(handoverRows)
      }

      onSuccess()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const otherShifts = shifts.filter(s => s.id !== form.shift_id)
  const supervisorsFiltered = supervisors.filter(s => s.id !== profile?.id)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Shift select */}
      {!supervisorShiftId && (
        <Select
          label="Turno"
          value={form.shift_id}
          onChange={e => setForm({ ...form, shift_id: e.target.value })}
          error={errors.shift_id}
          placeholder="Seleccionar turno..."
          options={shifts.map(s => ({ value: s.id, label: s.name }))}
        />
      )}

      {supervisorShiftId && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 font-medium">
          Turno: {shifts.find(s => s.id === supervisorShiftId)?.name}
        </div>
      )}

      <Input
        label="Fecha y hora"
        type="datetime-local"
        value={form.received_at}
        onChange={e => setForm({ ...form, received_at: e.target.value })}
        error={errors.received_at}
      />

      {/* Recibí el turno de */}
      <div className="border border-green-200 dark:border-green-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <ArrowDown size={15} className="text-green-500" />
          Recibí el turno de
        </div>
        <Select
          label="Supervisor"
          value={form.received_from_supervisor_id}
          onChange={e => setForm({ ...form, received_from_supervisor_id: e.target.value })}
          placeholder="Seleccionar supervisor..."
          options={supervisorsFiltered.map(s => ({ value: s.id, label: s.full_name }))}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Operadores <span className="font-normal text-gray-400 text-xs">(máx. 3)</span>
          </label>
          <EmployeePicker
            employees={allEmployees}
            selected={receivedFromOperators}
            onChange={setReceivedFromOperators}
          />
        </div>
      </div>

      {/* Le entregué el turno a */}
      <div className="border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <ArrowUp size={15} className="text-amber-500" />
          Le entregué el turno a
        </div>
        <Select
          label="Supervisor"
          value={form.handed_to_supervisor_id}
          onChange={e => setForm({ ...form, handed_to_supervisor_id: e.target.value })}
          placeholder="Seleccionar supervisor..."
          options={supervisorsFiltered.map(s => ({ value: s.id, label: s.full_name }))}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Operadores <span className="font-normal text-gray-400 text-xs">(máx. 3)</span>
          </label>
          <EmployeePicker
            employees={allEmployees}
            selected={handedToOperators}
            onChange={setHandedToOperators}
          />
        </div>
      </div>

      {/* Operators in shift */}
      {form.shift_id && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Users size={16} />
            Operadores en turno
          </div>
          {loadingEmployees ? (
            <p className="text-sm text-gray-500">Cargando operadores...</p>
          ) : shiftEmployees.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No hay operadores en este turno</p>
          ) : (
            <div className="space-y-2">
              {shiftEmployees.map(emp => {
                const hasChange = shiftChanges.some(sc => sc.employee_id === emp.id && sc.enabled)
                const changeEntry = shiftChanges.find(sc => sc.employee_id === emp.id && sc.enabled)
                return (
                  <div key={emp.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{emp.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.position}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Toggle
                          checked={operatorPresence[emp.id] ?? true}
                          onChange={v => setOperatorPresence(prev => ({ ...prev, [emp.id]: v }))}
                          label={operatorPresence[emp.id] ? 'Presente' : 'Ausente'}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleEmployeeChange(emp)}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
                          hasChange
                            ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-amber-50 hover:border-amber-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300'
                        }`}
                      >
                        <ArrowLeftRight size={11} />
                        {hasChange ? 'Cambio de turno activo' : 'Registrar cambio de turno'}
                      </button>
                    </div>

                    {hasChange && changeEntry && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <Select
                          label="Cambia a turno"
                          value={changeEntry.to_shift_id}
                          onChange={e => updateShiftChange(emp.id, 'to_shift_id', e.target.value)}
                          placeholder="Seleccionar turno..."
                          options={otherShifts.map(s => ({ value: s.id, label: s.name }))}
                        />
                        <Input
                          label="Motivo (opcional)"
                          value={changeEntry.reason}
                          onChange={e => updateShiftChange(emp.id, 'reason', e.target.value)}
                          placeholder="Motivo del cambio..."
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {errors.shift_changes && (
        <p className="text-xs text-red-500">{errors.shift_changes}</p>
      )}

      <Textarea
        label="Observaciones / Novedades adicionales"
        value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })}
        placeholder="Anote cualquier novedad relevante del turno..."
        rows={4}
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : 'Crear novedad'}
        </Button>
      </div>
    </form>
  )
}
