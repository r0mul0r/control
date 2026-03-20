'use client'

import { useState, useEffect, useRef } from 'react'
import type { Employee, Profile, Shift } from '@/types/database'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeftRight, Users, X, Plus, Search, ArrowDown, ArrowUp } from 'lucide-react'

interface ShiftChangeEntry {
  employee_id: string
  to_shift_id: string
  reason: string
  enabled: boolean
}

type HandoverDirection = 'received_from' | 'handed_to'
type HandoverType = 'supervisor' | 'operators' | ''

interface Props {
  shifts: Shift[]
  supervisors: Profile[]
  onSuccess: () => void
  onCancel: () => void
  supervisorShiftId?: string
}

// ─── Operator search dropdown ───────────────────────────────────────────────
function OperatorSearch({
  employees,
  excludeIds,
  onSelect,
}: {
  employees: Employee[]
  excludeIds: string[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = employees.filter(
    e => !excludeIds.includes(e.id) && e.full_name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar operador..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400 italic">
              {query ? 'Sin resultados' : 'Escribe para buscar...'}
            </p>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(emp.id); setQuery(''); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{emp.full_name}</span>
                <span className="text-xs text-gray-400 ml-2">{emp.position}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main form ───────────────────────────────────────────────────────────────
export default function NoveltyForm({ shifts, supervisors, onSuccess, onCancel, supervisorShiftId }: Props) {
  const { profile } = useAuth()
  const supabase = createClient()

  const [form, setForm] = useState({
    shift_id: supervisorShiftId || '',
    received_at: new Date().toISOString().slice(0, 16),
    notes: '',
  })

  // ── Handover state ──────────────────────────────────────────────────────
  const [activeDirection, setActiveDirection] = useState<'' | HandoverDirection>('')
  const [receivedType, setReceivedType] = useState<HandoverType>('')
  const [handedToType, setHandedToType] = useState<HandoverType>('')
  const [receivedFromSupervisorId, setReceivedFromSupervisorId] = useState('')
  const [handedToSupervisorId, setHandedToSupervisorId] = useState('')
  const [receivedFromOperators, setReceivedFromOperators] = useState<string[]>([])
  const [handedToOperators, setHandedToOperators] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState<Record<HandoverDirection, boolean>>({
    received_from: false,
    handed_to: false,
  })

  // ── Shift employees ─────────────────────────────────────────────────────
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [shiftEmployees, setShiftEmployees] = useState<Employee[]>([])
  const [operatorPresence, setOperatorPresence] = useState<Record<string, boolean>>({})
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('employees').select('*').eq('is_active', true).order('full_name')
      .then(({ data }) => setAllEmployees((data as Employee[]) || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!form.shift_id) {
      setShiftEmployees([]); setOperatorPresence({}); setShiftChanges([]); return
    }
    setLoadingEmployees(true)
    supabase.from('employees').select('*').eq('shift_id', form.shift_id).eq('is_active', true)
      .then(({ data }) => {
        const emps = (data as Employee[]) || []
        setShiftEmployees(emps)
        const p: Record<string, boolean> = {}
        emps.forEach(e => { p[e.id] = true })
        setOperatorPresence(p)
        setLoadingEmployees(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shift_id])

  // ── Helpers ─────────────────────────────────────────────────────────────
  const changeDirection = (dir: '' | HandoverDirection) => {
    setActiveDirection(dir)
    setShowSearch({ received_from: false, handed_to: false })
  }

  const changeType = (dir: HandoverDirection, t: HandoverType) => {
    if (dir === 'received_from') {
      setReceivedType(t); setReceivedFromSupervisorId(''); setReceivedFromOperators([])
    } else {
      setHandedToType(t); setHandedToSupervisorId(''); setHandedToOperators([])
    }
    setShowSearch(prev => ({ ...prev, [dir]: false }))
  }

  const addOperator = (dir: HandoverDirection, empId: string) => {
    if (dir === 'received_from') setReceivedFromOperators(prev => [...prev, empId])
    else setHandedToOperators(prev => [...prev, empId])
    setShowSearch(prev => ({ ...prev, [dir]: false }))
  }

  const removeOperator = (dir: HandoverDirection, empId: string) => {
    if (dir === 'received_from') setReceivedFromOperators(prev => prev.filter(id => id !== empId))
    else setHandedToOperators(prev => prev.filter(id => id !== empId))
  }

  const clearDirection = (dir: HandoverDirection) => {
    if (dir === 'received_from') {
      setReceivedType(''); setReceivedFromSupervisorId(''); setReceivedFromOperators([])
    } else {
      setHandedToType(''); setHandedToSupervisorId(''); setHandedToOperators([])
    }
  }

  const toggleEmployeeChange = (emp: Employee) => {
    const exists = shiftChanges.find(sc => sc.employee_id === emp.id && sc.enabled)
    if (exists) {
      setShiftChanges(prev => prev.filter(sc => sc.employee_id !== emp.id))
    } else {
      setShiftChanges(prev => [...prev.filter(sc => sc.employee_id !== emp.id),
        { employee_id: emp.id, to_shift_id: '', reason: '', enabled: true }])
    }
  }

  const updateShiftChange = (employee_id: string, field: 'to_shift_id' | 'reason', value: string) => {
    setShiftChanges(prev => prev.map(sc => sc.employee_id === employee_id ? { ...sc, [field]: value } : sc))
  }

  // ── Summary labels ──────────────────────────────────────────────────────
  const receivedLabel = [
    receivedFromSupervisorId && supervisors.find(s => s.id === receivedFromSupervisorId)?.full_name,
    ...receivedFromOperators.map(id => allEmployees.find(e => e.id === id)?.full_name),
  ].filter(Boolean).join(', ')

  const handedLabel = [
    handedToSupervisorId && supervisors.find(s => s.id === handedToSupervisorId)?.full_name,
    ...handedToOperators.map(id => allEmployees.find(e => e.id === id)?.full_name),
  ].filter(Boolean).join(', ')

  const supervisorsFiltered = supervisors.filter(s => s.id !== profile?.id)

  // ── Validate & submit ───────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.shift_id) errs.shift_id = 'El turno es requerido'
    if (!form.received_at) errs.received_at = 'La fecha y hora son requeridas'
    if (shiftChanges.some(sc => sc.enabled && !sc.to_shift_id))
      errs.shift_changes = 'Selecciona el turno de destino para los cambios'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: novelty, error: novErr } = await (supabase.from('novelties') as any)
        .insert({
          shift_id: form.shift_id,
          supervisor_id: profile!.id,
          received_from_supervisor_id: receivedFromSupervisorId || null,
          handed_to_supervisor_id: handedToSupervisorId || null,
          received_at: new Date(form.received_at).toISOString(),
          notes: form.notes || null,
        })
        .select().single()
      if (novErr) throw novErr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nid = (novelty as any).id

      if (shiftEmployees.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('novelty_operators').insert(shiftEmployees.map(emp => ({
          novelty_id: nid, employee_id: emp.id, is_present: operatorPresence[emp.id] ?? true,
        })) as any)
      }

      const activeChanges = shiftChanges.filter(sc => sc.enabled && sc.to_shift_id)
      if (activeChanges.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('shift_changes').insert(activeChanges.map(sc => ({
          novelty_id: nid, employee_id: sc.employee_id,
          from_shift_id: form.shift_id, to_shift_id: sc.to_shift_id, reason: sc.reason || null,
        })) as any)
      }

      const handoverRows = [
        ...receivedFromOperators.map(id => ({ novelty_id: nid, employee_id: id, direction: 'received_from' as const })),
        ...handedToOperators.map(id => ({ novelty_id: nid, employee_id: id, direction: 'handed_to' as const })),
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

  // ── Render handover panel ────────────────────────────────────────────────
  const renderPanel = (dir: HandoverDirection) => {
    const isReceived = dir === 'received_from'
    const type = isReceived ? receivedType : handedToType
    const supervisorId = isReceived ? receivedFromSupervisorId : handedToSupervisorId
    const setSupervisorId = isReceived ? setReceivedFromSupervisorId : setHandedToSupervisorId
    const operatorIds = isReceived ? receivedFromOperators : handedToOperators
    const isSearchOpen = showSearch[dir]

    return (
      <div className="space-y-3 pt-1">
        {/* Type select */}
        <Select
          label={isReceived ? '¿De quién recibiste el turno?' : '¿A quién le entregaste el turno?'}
          value={type}
          onChange={e => changeType(dir, e.target.value as HandoverType)}
          placeholder="Seleccionar tipo..."
          options={[
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'operators', label: 'Operadores' },
          ]}
        />

        {/* Supervisor dropdown */}
        {type === 'supervisor' && (
          <Select
            label="Supervisor"
            value={supervisorId}
            onChange={e => setSupervisorId(e.target.value)}
            placeholder="Seleccionar supervisor..."
            options={supervisorsFiltered.map(s => ({ value: s.id, label: s.full_name }))}
          />
        )}

        {/* Operators: chips + search */}
        {type === 'operators' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Operadores
            </label>

            {/* Added chips */}
            {operatorIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {operatorIds.map(id => {
                  const emp = allEmployees.find(e => e.id === id)
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    >
                      {emp?.full_name}
                      <button
                        type="button"
                        onClick={() => removeOperator(dir, id)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Search input or + button */}
            {operatorIds.length === 0 || isSearchOpen ? (
              <OperatorSearch
                employees={allEmployees}
                excludeIds={operatorIds}
                onSelect={id => addOperator(dir, id)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(prev => ({ ...prev, [dir]: true }))}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus size={13} />
                Agregar operador
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const otherShifts = shifts.filter(s => s.id !== form.shift_id)

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Shift */}
      {!supervisorShiftId ? (
        <Select
          label="Turno"
          value={form.shift_id}
          onChange={e => setForm({ ...form, shift_id: e.target.value })}
          error={errors.shift_id}
          placeholder="Seleccionar turno..."
          options={shifts.map(s => ({ value: s.id, label: s.name }))}
        />
      ) : (
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

      {/* ── Handover section ─────────────────────────────────────────────── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Traspaso de turno</p>

        {/* Summaries of already-filled directions */}
        {receivedLabel && (
          <div
            className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg cursor-pointer"
            onClick={() => changeDirection('received_from')}
          >
            <ArrowDown size={13} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400 shrink-0">Recibí de:</span>
            <span className="text-xs text-green-600 dark:text-green-300 truncate">{receivedLabel}</span>
            <button
              type="button"
              className="ml-auto text-green-500 hover:text-red-500 shrink-0 transition-colors"
              onClick={e => { e.stopPropagation(); clearDirection('received_from') }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {handedLabel && (
          <div
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg cursor-pointer"
            onClick={() => changeDirection('handed_to')}
          >
            <ArrowUp size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">Entregué a:</span>
            <span className="text-xs text-amber-600 dark:text-amber-300 truncate">{handedLabel}</span>
            <button
              type="button"
              className="ml-auto text-amber-500 hover:text-red-500 shrink-0 transition-colors"
              onClick={e => { e.stopPropagation(); clearDirection('handed_to') }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Direction select */}
        <Select
          label="¿Qué deseas registrar?"
          value={activeDirection}
          onChange={e => changeDirection(e.target.value as '' | HandoverDirection)}
          placeholder="Seleccionar acción..."
          options={[
            { value: 'received_from', label: 'Recibí el turno de...' },
            { value: 'handed_to', label: 'Le entregué el turno a...' },
          ]}
        />

        {/* Active panel */}
        {activeDirection && renderPanel(activeDirection)}
      </div>

      {/* ── Operators in shift ───────────────────────────────────────────── */}
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
                      <div className="shrink-0">
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

      {errors.shift_changes && <p className="text-xs text-red-500">{errors.shift_changes}</p>}

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
