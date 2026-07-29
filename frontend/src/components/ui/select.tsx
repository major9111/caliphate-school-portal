import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-11 w-full appearance-none rounded-xl border bg-[var(--surface)] pl-3.5 pr-9 py-2 text-sm text-[var(--text)] transition-shadow duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            invalid
              ? 'border-red-400 dark:border-red-500/60 focus-visible:ring-4 focus-visible:ring-red-500/10'
              : 'border-[var(--border)] focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }