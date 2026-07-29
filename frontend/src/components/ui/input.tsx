import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] transition-shadow duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          invalid
            ? 'border-red-400 dark:border-red-500/60 focus-visible:ring-4 focus-visible:ring-red-500/10'
            : 'border-[var(--border)] focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
