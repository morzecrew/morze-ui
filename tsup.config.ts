import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
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
