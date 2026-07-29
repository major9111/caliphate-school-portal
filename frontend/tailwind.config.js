/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indigo — primary brand accent
        primary: {
          50: '#EEF0FF', 100: '#E0E4FF', 200: '#C7CDFF', 300: '#A5AEFF',
          400: '#818CF8', 500: '#4F46E5', 600: '#4338CA', 700: '#3730A3',
          800: '#312E81', 900: '#231F6B',
        },
        // Cyan — secondary accent
        accent: {
          50: '#E6F9FC', 100: '#CDF3F9', 200: '#9CE6F3', 300: '#67D9ED',
          400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490',
        },
        // Emerald — positive / success
        success: {
          50: '#E9FBF3', 100: '#D1F7E4', 300: '#6EE7B7', 500: '#10B981', 600: '#059669',
        },
        // Amber — warnings / neutral highlights
        warn: {
          50: '#FEF6E7', 300: '#FCD34D', 500: '#F59E0B', 600: '#D97706',
        },
        // Slate neutrals (kept as `secondary` for backwards compatibility with existing className usage)
        secondary: {
          50: '#FAFAF9', 100: '#F4F4F3', 150: '#EDEDEB', 200: '#E7E5E2',
          300: '#D3D1CC', 400: '#8A8D96', 500: '#5B5E68', 600: '#44464E',
          700: '#2E3038', 800: '#1B1D23', 900: '#12161D', 950: '#0B0F14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl2': '18px',
        'xl3': '22px',
        'xl4': '28px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(20, 21, 26, 0.06), 0 10px 20px -2px rgba(20, 21, 26, 0.04)',
        'medium': '0 12px 32px -8px rgba(20, 21, 26, 0.12), 0 4px 12px -4px rgba(20, 21, 26, 0.06)',
        'lifted': '0 24px 48px -24px rgba(20, 21, 26, 0.18)',
        'glass': '0 8px 32px -8px rgba(20, 21, 26, 0.14), inset 0 1px 0 0 rgba(255,255,255,0.4)',
      },
      backdropBlur: {
        xs: '12px',
      },
    },
  },
  plugins: [],
} 