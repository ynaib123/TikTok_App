import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_USE_MOCK_ADMIN_AUTH': JSON.stringify('false'),
    'import.meta.env.VITE_MOCK_ADMIN_EMAIL': JSON.stringify(''),
    'import.meta.env.VITE_MOCK_ADMIN_PASSWORD': JSON.stringify(''),
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.vitest.{ts,tsx}'],
    css: false,
  },
});
