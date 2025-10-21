// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    // add visualizer only on production builds
    ...(import.meta.env && import.meta.env.PROD ? [visualizer({ filename: 'dist/bundle-visualizer.html', open: false })] : [])
  ],
  base: './',   // 👈 importante para Vercel, evita rutas rotas
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor.react';
            if (id.includes('supabase')) return 'vendor.supabase';
            if (id.includes('@heroicons')) return 'vendor.heroicons';
            if (id.includes('lodash')) return 'vendor.lodash';
            if (id.includes('clsx')) return 'vendor.clsx';
            return 'vendor.other';
          }
        }
      }
    }
    ,
    // add visualizer plugin to generate an HTML report (only in production builds)
    minify: 'esbuild'
  }
})