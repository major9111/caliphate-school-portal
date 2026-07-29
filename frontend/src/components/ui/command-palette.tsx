import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CommandItem {
  title: string
  href: string
  icon: React.ElementType
}

interface CommandPaletteProps {
  items: CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Glass command palette (⌘K / Ctrl+K). Purely client-side fuzzy-jump across
 * the app's own nav items — no backend search exists yet, so this is scoped
 * to what can honestly be delivered without inventing an API.
 */
export function CommandPalette({ items, open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8)
    const q = query.toLowerCase()
    return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 8)
  }, [items, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    if (open) {
      setQuery('')
      const t = setTimeout(() => inputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
  }, [open])

  const select = (href: string) => {
    navigate(href)
    onOpenChange(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) select(results[activeIndex].href)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass-panel fixed top-[14vh] left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-lg rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
              <Search className="h-4 w-4 text-[var(--text-3)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Jump to a page…"
                aria-label="Search pages"
                className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-3)] text-[var(--text)]"
              />
              <kbd className="text-[10px] text-[var(--text-3)] border border-[var(--border)] rounded px-1.5 py-0.5 font-mono flex-shrink-0">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="text-center text-sm text-[var(--text-3)] py-6">No matching pages</p>
              )}
              {results.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => select(item.href)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors',
                    i === activeIndex
                      ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                      : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.title}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette