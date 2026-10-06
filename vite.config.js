import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // En desarrollo: deshabilitar SW completamente para evitar
      // SecurityError: "unsupported MIME type (text/html)" y conflictos de HMR
      devOptions: {
        enabled: false,
      },
      registerType: 'prompt',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ['/sw-notifications.js']
      },
      // Solo incluir el manifest en producción
      manifest: mode === 'production' ? {
        name: 'Monety - Finanzas Personales',
        short_name: 'Monety',
        description: 'Finanzas personales inteligentes',
        theme_color: '#080E0C',
        background_color: '#080E0C',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      } : false
    })
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client']
  },
  server: {
    host: 'localhost',
    port: 5173,
    open: true,
    // HMR estabilizado — evita errores de WebSocket en dev local
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: false
    }
  },
  build: {
    // Tolerancia de advertencia para chunks grandes (1500 kB)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalized = id.replace(/\\/g, '/');

          // 1. Ecosistema de React
          if (
            normalized.includes('/react/') ||
            normalized.includes('/react-dom/') ||
            normalized.includes('/react-router-dom/') ||
            normalized.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          // 2. Cliente de Supabase
          if (normalized.includes('/@supabase/')) {
            return 'vendor-supabase';
          }

          // 3. Librería de iconos
          if (
            normalized.includes('/lucide-react/') ||
            normalized.includes('/@icons-pack/react-simple-icons/')
          ) {
            return 'vendor-icons';
          }

          // 4. Gráficos y visualización
          if (
            normalized.includes('/chart.js/') ||
            normalized.includes('/recharts/') ||
            normalized.includes('/canvas-confetti/') ||
            normalized.includes('/html-to-image/')
          ) {
            return 'vendor-visuals';
          }

          // 5. Resto de librerías de terceros
          return 'vendor-libs';
        }
      }
    }
  }
}));
