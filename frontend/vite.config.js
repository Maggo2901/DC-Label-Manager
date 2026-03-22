import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')

  return {
    plugins: [react()],
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@labelSchemas': path.resolve(__dirname, '../shared/labelSchemas'),
      },
    },
    server: command === 'serve'
      ? {
          proxy: {
            '/api': {
              target: env.VITE_DEV_API_TARGET || 'http://localhost:3000',
              changeOrigin: true
            }
          }
        }
      : undefined
  }
})
