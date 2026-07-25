/**
 * FUGUSAU Portal — Chart theme colors
 * Recharts needs literal color values (SVG attrs / inline styles can't reliably
 * resolve CSS custom properties across all renderers), so this hook returns
 * the right palette for the active theme instead.
 */
import { useTheme } from '@/contexts/ThemeContext'

export function useChartTheme() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return {
    grid:           isLight ? 'rgba(6,20,12,0.08)'  : 'rgba(255,255,255,0.04)',
    axis:           isLight ? 'rgba(6,20,12,0.35)'  : 'rgba(255,255,255,0.2)',
    tick:           isLight ? 'rgba(6,20,12,0.45)'  : 'rgba(255,255,255,0.4)',
    tickStrong:     isLight ? 'rgba(6,20,12,0.6)'   : 'rgba(255,255,255,0.5)',
    legend:         isLight ? 'rgba(6,20,12,0.55)'  : 'rgba(255,255,255,0.5)',
    ring:           isLight ? 'rgba(6,20,12,0.08)'  : 'rgba(255,255,255,0.06)',
    barTrack:       isLight ? 'rgba(6,20,12,0.05)'  : 'rgba(255,255,255,0.03)',
    tooltipBg:      isLight ? '#ffffff'             : '#0a1f15',
    tooltipBorder:  isLight ? 'rgba(6,20,12,0.12)'  : 'rgba(255,255,255,0.1)',
  }
}
