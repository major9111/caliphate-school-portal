import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-100/70 backdrop-blur-md text-primary-700',
    success: 'bg-green-100/70 backdrop-blur-md text-green-700',
    warning: 'bg-yellow-100/70 backdrop-blur-md text-yellow-700',
    danger: 'bg-red-100/70 backdrop-blur-md text-red-700',
    secondary: 'bg-secondary-100/70 backdrop-blur-md text-secondary-700',
    outline: 'border border-white/50 text-secondary-700',
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
