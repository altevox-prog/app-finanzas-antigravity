/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          'primary-fg': 'var(--brand-primary-text)',
          accent: 'var(--brand-accent)',
          'accent-bg': 'var(--brand-accent-bg)',
          // Light Mode Palette
          light: {
            bg: '#F7FCF5',
            card: '#FFFFFF',
            border: '#DBEED8',
            primary: '#123C15',
            accent: '#B1EB71',
            soft: '#F3FEE8',
            text: '#122315',
            muted: '#49634D'
          },
          // Dark Mode Palette
          dark: {
            bg: '#080E0C',
            card: '#101C18',
            border: '#1A2F28',
            primary: '#29D691',
            accent: '#29D691',
            contrast: '#05100B',
            text: '#F0FDF6',
            muted: '#8BA89C'
          },
          50: '#F3FEE8',
          100: '#DBEED8',
          200: '#B1EB71',
          500: '#29D691',
          600: '#10B981',
          700: '#123C15',
          800: '#122315',
          900: '#080E0C',
        }
      }
    },
  },
  plugins: [],
}
