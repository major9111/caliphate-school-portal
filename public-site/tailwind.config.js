/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Clash Display"', 'Sora', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#006B3F',
          light:   '#00A85A',
          dark:    '#004D2E',
        },
        gold: {
          DEFAULT: '#D4A017',
          light:   '#F5C842',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease forwards',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
}
