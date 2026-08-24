/**
 * esbuild drops module-level directives when bundling, so the "use client"
 * marker is re-attached here. Every export in the kit is interactive, so the
 * whole bundle is a client module.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIRECTIVE = '"use client";\n'

for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const path = resolve(root, file)
  const code = readFileSync(path, 'utf8')
  if (code.startsWith('"use client"') || code.startsWith("'use client'")) continue
  writeFileSync(path, DIRECTIVE + code)
  console.log(`  ${file}  + "use client"`)
}
