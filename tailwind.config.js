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
        surface: {
          base: '#09090b',       // Lienzo / Fondo base (page) zinc-950
          level1: '#18181b',     // Superficie nivel 1 (tarjetas / contenedores) zinc-900
          level2: '#27272a',     // Superficie nivel 2 (menús desplegables / modales / drawers) zinc-800
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
          // Dark Mode Palette
          dark: {
            bg: '#09090b',         // zinc-950 (Lienzo / Fondo base)
            card: '#18181b',       // zinc-900 (Superficie nivel 1: tarjetas)
            elevated: '#27272a',   // zinc-800 (Superficie nivel 2: modales, menús)
            border: 'rgba(255, 255, 255, 0.08)',
            primary: '#29D691',
            accent: '#29D691',
            contrast: '#09090b',
            text: '#f4f4f5',       // text-zinc-100 (87% luminosidad)
            muted: '#a1a1aa',      // text-zinc-400 (60% luminosidad)
            tertiary: '#52525b'    // text-zinc-600 (38% luminosidad)
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
