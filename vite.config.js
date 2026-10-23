import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BUILD_TIME = new Date().toISOString();
const VERSION_PAYLOAD = JSON.stringify({ version: '1.0.0', buildTime: BUILD_TIME, buildId: BUILD_TIME }, null, 2);

export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: VERSION_PAYLOAD });
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/version.json')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(VERSION_PAYLOAD);
            return;
          }
          next();
        });
      }
    },
    VitePWA({
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
        ],
      },
      manifest: mode === 'production' ? {
        id: '/?v=4',
        start_url: '/?v=4',
        name: 'Monety - Finanzas Personales',
        short_name: 'Monety',
        description: 'Finanzas personales inteligentes',
        theme_color: '#080E0C',
        background_color: '#080E0C',
        display: 'standalone',
        icons: [
          { src: '/icon-192-v4.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512-v4.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalized = id.replace(/\\/g, '/');

          if (
            normalized.includes('/react/') ||
            normalized.includes('/react-dom/') ||
            normalized.includes('/react-router-dom/') ||
            normalized.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          if (normalized.includes('/@supabase/')) {
            return 'vendor-supabase';
          }

          if (
            normalized.includes('/lucide-react/') ||
            normalized.includes('/@icons-pack/react-simple-icons/')
          ) {
            return 'vendor-icons';
          }

          if (
            normalized.includes('/chart.js/') ||
            normalized.includes('/recharts/') ||
            normalized.includes('/canvas-confetti/') ||
            normalized.includes('/html-to-image/')
          ) {
            return 'vendor-visuals';
          }

          return 'vendor-libs';
        }
      }
    }
  }
}));
