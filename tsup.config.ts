import { defineConfig } from 'tsup'

export default defineConfig({
  // Locales are separate entries so a host pays for the language it imports —
  // they are plain data and pull in nothing from the component bundle.
  entry: ['src/index.ts', 'src/form/index.tsx', 'src/locales/en.ts', 'src/locales/ru.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  splitting: false,
  target: 'es2021',
  // react-hook-form is an optional peer behind the ./form entry — bundling it
  // would put a form library in the main chunk of every consumer.
  external: ['react', 'react-dom', 'react-hook-form'],
  // The "use client" directive is re-attached in scripts/add-client-directive.mjs —
  // esbuild strips module-level directives while bundling.
})
