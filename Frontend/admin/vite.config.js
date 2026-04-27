import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8080'

  return {
    root: fileURLToPath(new URL('./', import.meta.url)),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: backendProxyTarget,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
        },
      },
    },
  }
})
