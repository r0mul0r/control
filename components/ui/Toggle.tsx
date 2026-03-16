'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors duration-200',
            checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </div>
      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      )}
    </label>
  )
}
