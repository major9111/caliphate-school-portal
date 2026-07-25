/**
 * FUGUSAU Portal — Theme Toggle
 * Small icon button that flips between dark and light mode.
 */
import { useTheme } from '@/contexts/ThemeContext'
import { IconSun, IconMoon } from '@/components/icons'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0 ${className}`}
    >
      {isLight ? <IconMoon size={17} /> : <IconSun size={17} />}
    </button>
  )
}
