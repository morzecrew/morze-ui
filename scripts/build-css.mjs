import { bundle } from 'lightningcss'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(resolve(root, 'dist'), { recursive: true })

const targets = {
  chrome: 111 << 16,
  firefox: 113 << 16,
  safari: (16 << 16) | (4 << 8),
}

/** @param {string} entry @param {string} out */
function build(entry, out) {
  const { code } = bundle({
    filename: resolve(root, entry),
    minify: true,
    targets,
    // Keep custom properties and modern colour syntax intact for theming.
    drafts: { customMedia: true },
  })
  writeFileSync(resolve(root, out), code)
  console.log(`  ${out}  ${(code.length / 1024).toFixed(1)} kB`)
}

console.log('building css:')
build('src/styles/index.css', 'dist/morze-ui.css')
build('src/styles/tokens.css', 'dist/morze-ui-tokens.css')
