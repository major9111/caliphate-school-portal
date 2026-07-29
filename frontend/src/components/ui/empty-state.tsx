import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="h-20 w-20 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-5 text-[var(--text-3)]">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && <p className="text-sm text-[var(--text-2)] max-w-sm mb-6">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
