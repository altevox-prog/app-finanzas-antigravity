import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BUILD_TIME = new Date().toISOString();

export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({
            version: '1.0.0',
            buildTime: BUILD_TIME,
            buildId: BUILD_TIME
          }, null, 2)
        });
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/version.json')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              version: '1.0.0',
              buildTime: BUILD_TIME,
              buildId: BUILD_TIME
            }, null, 2));
            return;
          }
          next();
        });
      }
    },
    VitePWA({
      // En desarrollo: deshabilitar SW completamente para evitar
      // SecurityError: "unsupported MIME type (text/html)" y conflictos de HMR
      devOptions: {
        enabled: false,
      },
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
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
