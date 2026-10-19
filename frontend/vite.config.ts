import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // /api idzie do Spring Boota, wiec front i API sa na jednym originie
  // (ciasteczko sesji bez SameSite=None, bez CORS).
  server: {
    proxy: {
      '/api': process.env.BACKEND_URL ?? 'http://localhost:8080',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
