import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
      outline: 'border border-secondary-300 bg-white hover:bg-secondary-50 text-secondary-700',
      ghost: 'hover:bg-secondary-100 text-secondary-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    }
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3 text-sm',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    }
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
