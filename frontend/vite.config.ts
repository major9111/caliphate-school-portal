import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // Defaults to '/' for the standalone portal deployment (unchanged
    // behaviour). The combined-build script sets VITE_BASE_PATH=/portal/ so
    // this same app can be served from a subpath alongside the public site.
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': { target: 'http://localhost:8000', changeOrigin: true },
        '/ws':  { target: 'ws://localhost:8000',  ws: true },
      },
    },
  }
})
