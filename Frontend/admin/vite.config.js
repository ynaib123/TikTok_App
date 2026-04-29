import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL('./', import.meta.url))
  const env = loadEnv(mode, rootDir, '')
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8080'
  const allowedHosts = String(env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

  return {
    root: rootDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      allowedHosts,
      port: 5174,
      strictPort: true,
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: backendProxyTarget,
          changeOrigin: true,
          timeout: 6 * 60 * 1000,
          proxyTimeout: 6 * 60 * 1000,
        },
      },
    },
  }
})
