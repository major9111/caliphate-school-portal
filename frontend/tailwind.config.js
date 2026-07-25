/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006B3F',
          light:   '#00A85A',
          dark:    '#004D2E',
          glow:    'rgba(0,107,63,0.3)',
        },
        gold: {
          DEFAULT: '#D4A017',
          light:   '#F5C842',
        },
        surface: {
          DEFAULT: 'rgba(26,43,32,0.7)',
          solid:   '#1A2B20',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          border:  'rgba(255,255,255,0.08)',
          hover:   'rgba(255,255,255,0.07)',
        },
        // `dark` and `white` are theme-aware: their RGB channels come from CSS
        // custom properties that flip between dark/light in globals.css via the
        // `[data-theme]` attribute on <html>. Since almost every page uses
        // `bg-dark`, `text-white/NN`, `border-white/[0.NN]` etc. for its base
        // colors, this repaints the whole app on toggle with no per-page edits.
        dark: {
          DEFAULT: 'rgb(var(--color-dark) / <alpha-value>)',
          2:       'rgb(var(--color-dark-2) / <alpha-value>)',
          3:       'rgb(var(--color-dark-3) / <alpha-value>)',
        },
        white: 'rgb(var(--color-white) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '16px',
      },
      boxShadow: {
        glow:       '0 0 30px rgba(0,107,63,0.25)',
        'glow-sm':  '0 0 12px rgba(0,107,63,0.2)',
        glass:      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg': '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'fade-in':      'fadeIn 0.5s ease forwards',
        'slide-up':     'slideUp 0.4s ease forwards',
        'shimmer':      'shimmer 2s infinite',
        'float':        'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,107,63,0.2)' },
          '50%':       { boxShadow: '0 0 40px rgba(0,107,63,0.5)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
