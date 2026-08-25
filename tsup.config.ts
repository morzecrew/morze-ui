import { defineConfig } from 'tsup'

export default defineConfig({
  // Locales are separate entries so a host pays for the language it imports —
  // they are plain data and pull in nothing from the component bundle.
  entry: ['src/index.ts', 'src/locales/en.ts', 'src/locales/ru.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  splitting: false,
  target: 'es2021',
  external: ['react', 'react-dom'],
  // The "use client" directive is re-attached in scripts/add-client-directive.mjs —
  // esbuild strips module-level directives while bundling.
})
