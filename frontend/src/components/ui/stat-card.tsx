import { motion } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: number
  prefix?: string
  suffix?: string
  icon: React.ElementType
  tone?: 'primary' | 'accent' | 'success' | 'warn'
  trend?: string
  trendPositive?: boolean
  index?: number
}

const TONES: Record<string, string> = {
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-300',
  accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
  success: 'bg-success-500/10 text-success-600 dark:text-success-300',
  warn: 'bg-warn-500/10 text-warn-600 dark:text-warn-300',
}

export function StatCard({
  title, value, prefix = '', suffix = '', icon: Icon,
  tone = 'primary', trend, trendPositive = true, index = 0,
}: StatCardProps) {
  const count = useCountUp(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className="rounded-xl3 border border-[var(--border)] bg-[var(--surface)] shadow-soft p-5 transition-all duration-300 hover:shadow-medium hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-medium px-2 py-1 rounded-full',
              trendPositive
                ? 'bg-success-500/10 text-success-600 dark:text-success-300'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="font-mono font-semibold text-2xl text-[var(--text)]">
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      <p className="text-[var(--text-2)] text-[13px] mt-1">{title}</p>
    </motion.div>
  )
}