import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O proxy /api -> backend evita problemas de CORS em desenvolvimento.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
