import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    env: {
      // CI has no .env.local — axios needs an absolute baseURL in Node,
      // and MSW handlers match any host via the */api/* wildcard
      VITE_API_BASE_URL: 'http://api.test.local',
      // Non-empty so useAuth's token-acquisition path is exercised in tests
      VITE_MSAL_API_SCOPE: 'api://test-backend/access_as_user',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/stores/**', 'src/hooks/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
