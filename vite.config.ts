import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el repositorio se sirve como /reservaciones/
// En producción con dominio propio usar base: '/'
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: parseInt(process.env.PORT ?? '5173'),
  },
})
