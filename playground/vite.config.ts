import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      '@morze/ui/styles.css': fileURLToPath(new URL('../src/styles/index.css', import.meta.url)),
      '@morze/ui': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5250, strictPort: false },
})
