import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            error
              ? 'border-red-400 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
