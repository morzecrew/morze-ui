#!/usr/bin/env node
/**
 * A version's section of CHANGELOG.md, as the body of its GitHub release.
 *
 *   node scripts/release-notes.mjs 0.6.0 [path/to/CHANGELOG.md]
 *
 * Shared by `npm run release` and the release workflow, so a release reads the
 * same whichever of them made it.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The section under `## [<heading>]` — up to the next `## [` — with where it
 * starts and where its body does. `null` when there is no such section.
 */
export function section(text, heading) {
  const marker = `\n## [${heading}]`
  const start = text.indexOf(marker)
  if (start < 0) return null
  const bodyStart = text.indexOf('\n', start + 1) + 1
  const next = text.indexOf('\n## [', bodyStart)
  const end = next < 0 ? text.length : next + 1
  return { start: start + 1, bodyStart, end, body: text.slice(bodyStart, end).trim() }
}

/**
 * The section as a release body. CHANGELOG.md is hard-wrapped at 80 columns,
 * and GitHub renders a single newline in a release as a line break — so
 * paragraphs and list items are joined back into one line each. Code blocks
 * are left alone.
 */
export function releaseNotes(body, version) {
  const lines = []
  let code = false
  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) {
      code = !code
      lines.push(line)
      continue
    }
    const previous = lines[lines.length - 1]
    const startsBlock = code || line.trim() === '' || /^(#|---|\s*[-*] |\s*\d+\. |\s*\|)/.test(line)
    const joinable =
      previous !== undefined && previous.trim() !== '' && !/^(#|---|\s*```|\s*\|)/.test(previous)
    if (!startsBlock && joinable) lines[lines.length - 1] = `${previous.trimEnd()} ${line.trim()}`
    else lines.push(line)
  }
  const url = `https://github.com/morzecrew/morze-ui/blob/v${version}/CHANGELOG.md`
  return `${lines.join('\n').trim()}\n\n---\n\nThe full history is in [CHANGELOG.md](${url}).\n`
}

// Run as a script: print the notes for the version given.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [version, path] = process.argv.slice(2)
  if (!version) {
    console.error('usage: node scripts/release-notes.mjs <version> [CHANGELOG.md]')
    process.exit(2)
  }
  const file = path ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md')
  const found = section(readFileSync(file, 'utf8'), version)
  if (!found || !found.body) {
    console.error(`CHANGELOG.md has no entries under ## [${version}].`)
    process.exit(1)
  }
  process.stdout.write(releaseNotes(found.body, version))
}
