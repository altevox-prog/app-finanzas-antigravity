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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"JetBrains Mono"', '"Liberation Mono"', 'monospace'],
      },
      borderRadius: {
        chip: '6px',        // Chips / Badges: rounded-md (6px)
        badge: '6px',
        input: '8px',       // Botones e Inputs: rounded-lg (8px)
        btn: '8px',
        card: '16px',       // Tarjetas principales: rounded-2xl (16px) o rounded-xl (12px)
        modal: '20px',      // Modales: rounded-2xl (16px a 20px)
      },
      colors: {
        canvas: '#0A0C10',
        surface: {
          DEFAULT: '#12151E',
          base: '#0A0C10',       // Lienzo / Fondo base (page) 60%
          level1: '#12151E',     // Superficie nivel 1 (tarjetas / contenedores) 30%
          level2: '#181C27',     // Superficie nivel 2 (menús desplegables / modales / hover)
        },
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
          // Dark Mode Palette (60-30-10 & Monety Emerald)
          dark: {
            bg: '#0A0C10',         // 60% Canvas dominante
            card: '#12151E',       // 30% Superficie
            elevated: '#181C27',   // Superficie secundaria / hover
            border: 'rgba(255, 255, 255, 0.07)',
            primary: '#10B981',    // 10% Acento esmeralda Monety
            accent: '#10B981',
            contrast: '#0A0C10',
            text: '#F8FAFC',       // text.primary
            muted: '#94A3B8',      // text.secondary
            tertiary: '#64748B'    // text.muted
          },
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        }
      }
    },
  },
  plugins: [],
}
