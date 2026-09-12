import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // The layout-dependent specs need a real engine — see
    // vitest.browser.config.ts and `npm run test:browser`.
    exclude: ['**/node_modules/**', 'tests/**/*.browser.test.{ts,tsx}'],
  },
})
