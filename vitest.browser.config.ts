import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

/**
 * The layout-dependent half of the suite.
 *
 * happy-dom has no layout engine: `clientWidth` is always 0, so auto-fit never
 * runs and the ResizeObserver feedback loop that once froze the tab (see
 * FIXES.md) cannot reproduce. Both were guarded by comments alone. These specs
 * run in a real Chrome instead. The specs are named `*.browser.test.tsx` and
 * kept out of `npm test`, so the fast suite stays fast.
 *
 * `channel: 'chrome'` uses the Chrome already on the machine rather than
 * Playwright's own download; `npm i` therefore stays a normal install, and CI
 * either has a Chrome or runs `npx playwright install chromium` once.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.browser.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    globals: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'chrome' } }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
