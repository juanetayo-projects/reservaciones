import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [{ src: 'images/*', dest: 'images' }],
    }),
  ],
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
