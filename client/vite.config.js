import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/news': 'http://localhost:8000',
      '/analysis': 'http://localhost:8000',
      '/trade': 'http://localhost:8000',
      '/predict': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
