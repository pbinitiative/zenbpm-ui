import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import i18nTypesPlugin from './scripts/generate-i18n-types.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), i18nTypesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@base': path.resolve(__dirname, './src/base'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
