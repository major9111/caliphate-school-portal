import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-500/10 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300',
    success: 'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-300',
    warning: 'bg-warn-500/10 text-warn-600 dark:bg-warn-500/15 dark:text-warn-300',
    danger: 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    secondary: 'bg-[var(--surface-2)] text-[var(--text-2)]',
    outline: 'border border-[var(--border)] text-[var(--text-2)]',
  }
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
