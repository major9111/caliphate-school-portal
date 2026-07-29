import { type ReactNode } from 'react'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  className?: string
  rowKey: (row: T) => string
}

export function DataTable<T>({
  columns, data, isLoading, emptyIcon, emptyTitle = 'No data', emptyDescription,
  emptyAction, className, rowKey
}: DataTableProps<T>) {
  if (isLoading) return <SkeletonTable rows={6} cols={columns.length} />

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] p-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-2)]">
              {columns.map(col => (
                <td key={col.key} className={cn('p-3.5 text-sm text-[var(--text-2)]', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
