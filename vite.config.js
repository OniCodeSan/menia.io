import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    // modulePreload di default preloada *tutti* i chunk raggiungibili dall'entry,
    // anche quelli dietro lazy(). Filtriamo i chunk grossi non-critical (motion,
    // sentry) così loadano solo quando serve. Risparmio: ~115KB sul cold start.
    modulePreload: {
      polyfill: true,
      resolveDependencies(filename, deps) {
        return deps.filter((dep) =>
          !dep.includes('vendor-motion') &&
          !dep.includes('vendor-sentry')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('@sentry')) return 'vendor-sentry';
            if (id.includes('react-helmet')) return 'vendor-helmet';
            if (/[\\/]react[\\/]|react-dom/.test(id)) return 'vendor-react';
          }
        },
      },
    },
  },
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug', 'console.info'],
  },
});
