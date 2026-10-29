#!/usr/bin/env node
/**
 * `npm run release` — cut a version from `## [Unreleased]` and hand it to CI.
 *
 * Zero dependencies, like the commit-msg hook: Node, git and the `gh` CLI the
 * repo already relies on. The steps, in the order that keeps a failure cheap:
 *
 *   1. Preconditions — on main, no uncommitted changes to tracked files, not
 *      behind origin, the tag free, `gh` signed in, and something written
 *      under `## [Unreleased]` in CHANGELOG.md.
 *   2. The version — patch / minor / major / your own, with one recommended
 *      from what the changelog says (a Breaking section is a minor bump in
 *      0.x and a major one after 1.0; an Added section is a minor bump).
 *   3. typecheck, test and build — before any file is touched, so a red run
 *      leaves the tree exactly as it was. `--browser` adds the Chrome specs.
 *   4. CHANGELOG `[Unreleased]` becomes `[x.y.z] — date` (with a fresh, empty
 *      `[Unreleased]` above it), package.json and the lockfile move to x.y.z,
 *      `chore: bump x.y.z` is committed and `vx.y.z` tagged — all local.
 *   5. Only after a yes: push the commit and the tag. The push is the
 *      release: .github/workflows/release.yml sees the `chore: bump` commit,
 *      creates the GitHub release from that changelog section and publishes
 *      the package to npm through trusted publishing — no token anywhere.
 *
 * Flags: --version <x.y.z | patch | minor | major>, --yes (no questions),
 * --browser, --dry-run (prints what would happen and changes nothing), and
 * --local for a release without CI: the GitHub release from here, and
 * `npm publish` after its own question (default no; --npm says yes).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { releaseNotes, section as changelogSection } from './release-notes.mjs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = join(root, 'CHANGELOG.md')

/* ------------------------------------------------------------------ flags */

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const option = (name) => {
  const at = argv.indexOf(`--${name}`)
  return at >= 0 ? argv[at + 1] : undefined
}
const DRY = flag('dry-run')
const YES = flag('yes')
const LOCAL = flag('local')

/* ---------------------------------------------------------------- helpers */

const bold = (text) => (process.stdout.isTTY ? `\x1b[1m${text}\x1b[22m` : text)
const dim = (text) => (process.stdout.isTTY ? `\x1b[2m${text}\x1b[22m` : text)
const step = (text) => console.log(`\n${bold('›')} ${text}`)

function fail(message, hint) {
  console.error(`\n✖ ${message}`)
  if (hint) console.error(`  ${hint}`)
  process.exit(1)
}

/** A command's output, trimmed; throws with its stderr if it fails. */
function out(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** A command run in the open, its output on the terminal; exits on failure. */
function run(command, args, what) {
  console.log(dim(`  $ ${command} ${args.join(' ')}`))
  if (DRY && what === 'change') return
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) fail(`\`${command} ${args.join(' ')}\` failed (exit ${result.status}).`)
}

/* Answers are read from a queue of lines rather than with `rl.question`: with
   the answers piped in, readline reads every line at once and a line that
   arrives before its question is asked is lost — the next question then
   waits on a closed stdin and the process quietly exits. And running out of
   input is never taken for a default: a release is not pushed on a "yes"
   nobody typed. */
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })
const lines = []
const waiting = []
let closed = false
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)))
rl.on('close', () => {
  closed = true
  while (waiting.length) waiting.shift()(null)
})
async function ask(question, whatIsLeft = 'Nothing past this point was done.') {
  process.stdout.write(question)
  const line = lines.length ? lines.shift() : closed ? null : await new Promise((r) => waiting.push(r))
  if (line === null) fail('No answer — the input ended.', whatIsLeft)
  if (!process.stdin.isTTY) process.stdout.write(`${line}\n`)
  return line.trim()
}
async function confirm(question, fallback, whatIsLeft) {
  if (YES) return fallback
  const answer = (await ask(`${question} ${fallback ? '[Y/n]' : '[y/N]'} `, whatIsLeft)).toLowerCase()
  return answer === '' ? fallback : answer === 'y' || answer === 'yes' || answer === 'д' || answer === 'да'
}

/* ----------------------------------------------------------------- semver */

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/

function bump(version, kind) {
  const [, major, minor, patch] = SEMVER.exec(version).map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/** Greater than, by the three numbers; a pre-release tail is ignored. */
function newer(a, b) {
  const pa = SEMVER.exec(a).slice(1, 4).map(Number)
  const pb = SEMVER.exec(b).slice(1, 4).map(Number)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i]
  return false
}

/* -------------------------------------------------------------- changelog */

const unreleased = (text) => changelogSection(text, 'Unreleased')

/* ------------------------------------------------------------------- main */

async function main() {
  if (DRY) console.log(bold('Dry run — nothing will be written, committed or pushed.'))

  step('Checking the repository')
  const branch = out('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== 'main') fail(`On \`${branch}\`, not \`main\`.`, 'Releases are cut from main.')
  // Untracked files are left out: an editor's settings file is not a reason
  // to refuse, and nothing untracked can end up in the release commit.
  if (out('git', ['status', '--porcelain', '--untracked-files=no']))
    fail('There are uncommitted changes.', 'Commit or stash them first.')
  out('git', ['fetch', '--quiet', '--tags', 'origin'])
  const behind = Number(out('git', ['rev-list', '--count', 'HEAD..origin/main']))
  if (behind > 0) fail(`main is ${behind} commit(s) behind origin/main.`, 'Pull first.')
  const ahead = Number(out('git', ['rev-list', '--count', 'origin/main..HEAD']))
  if (ahead > 0) console.log(`  ${ahead} local commit(s) not pushed yet will go out with the release.`)
  if (LOCAL) {
    try {
      out('gh', ['auth', 'status'])
    } catch {
      fail('`gh` is not signed in.', 'Run `gh auth login`.')
    }
  }

  const changelog = readFileSync(CHANGELOG, 'utf8')
  const section = unreleased(changelog)
  if (!section) fail('CHANGELOG.md has no `## [Unreleased]` section.')
  if (!/^- /m.test(section.body))
    fail('`## [Unreleased]` is empty.', 'Write the entries first — the release notes are made from them.')

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const current = pkg.version
  const has = (heading) => new RegExp(`^### ${heading}\\b`, 'm').test(section.body)
  const [major] = current.split('.').map(Number)
  const recommended = has('Breaking') ? (major === 0 ? 'minor' : 'major') : has('Added') ? 'minor' : 'patch'
  const why = has('Breaking')
    ? major === 0
      ? 'a Breaking section — a minor bump in 0.x'
      : 'a Breaking section'
    : has('Added')
      ? 'an Added section'
      : 'fixes and changes only'
  console.log(`  ${bold(pkg.name)} is at ${bold(current)}; the changelog has ${why}.`)

  step('Choosing the version')
  let version = option('version')
  if (version && ['patch', 'minor', 'major'].includes(version)) version = bump(current, version)
  if (!version && YES) version = bump(current, recommended)
  if (!version) {
    const choices = ['patch', 'minor', 'major'].map((kind) => ({ kind, version: bump(current, kind) }))
    choices.forEach(({ kind, version: v }, index) => {
      const mark = kind === recommended ? '  ← recommended' : ''
      console.log(`  ${index + 1}) ${kind.padEnd(6)} ${v}${mark}`)
    })
    console.log('  4) other  type it')
    const fallback = choices.findIndex((choice) => choice.kind === recommended) + 1
    const answer = await ask(`  Which one? [${fallback}] `)
    // A number picks an option; anything else is taken as the version itself.
    if (answer !== '' && !/^\d+$/.test(answer)) version = answer
    else {
      const pick = answer === '' ? fallback : Number(answer)
      if (pick >= 1 && pick <= 3) version = choices[pick - 1].version
      else if (pick === 4) version = await ask('  Version: ')
      else fail(`No option ${answer}.`)
    }
  }
  version = version.replace(/^v/, '')
  if (!SEMVER.test(version)) fail(`\`${version}\` is not a version (x.y.z).`)
  if (!newer(version, current)) fail(`${version} is not newer than ${current}.`)
  const tag = `v${version}`
  if (out('git', ['tag', '-l', tag])) fail(`The tag ${tag} already exists.`)
  if (out('git', ['ls-remote', '--tags', 'origin', tag])) fail(`The tag ${tag} already exists on origin.`)
  console.log(`  Releasing ${bold(version)} as ${bold(tag)}.`)

  step('Running the checks')
  run('npm', ['run', 'typecheck'])
  run('npm', ['test'])
  if (flag('browser')) run('npm', ['run', 'test:browser'])
  run('npm', ['run', 'build'])

  step('Writing the release')
  const date = new Date().toISOString().slice(0, 10)
  const nextChangelog =
    changelog.slice(0, section.start) +
    `## [Unreleased]\n\n## [${version}] — ${date}\n\n` +
    changelog.slice(section.bodyStart).replace(/^\n+/, '')
  console.log(`  CHANGELOG.md: [Unreleased] → [${version}] — ${date}`)
  if (!DRY) writeFileSync(CHANGELOG, nextChangelog)
  run('npm', ['version', version, '--no-git-tag-version'], 'change')
  run('git', ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'], 'change')
  run('git', ['commit', '--quiet', '-m', `chore: bump ${version}`], 'change')
  run('git', ['tag', '-a', tag, '-m', version], 'change')

  const notes = releaseNotes(section.body, version)
  if (DRY) {
    console.log(`\n${dim('--- release notes ---')}\n${notes}${dim('---------------------')}`)
    console.log(`\n${bold('Dry run done.')} Nothing was changed.`)
    return
  }

  step('Publishing')
  const left = `Left local: the commit and the tag. Push later with\n    git push origin main ${tag}\n  To take it back: git tag -d ${tag} && git reset --hard HEAD~1`
  const question = LOCAL
    ? `  Push ${tag} to origin and create the GitHub release?`
    : `  Push ${tag} to origin? CI then releases it on GitHub and npm.`
  if (!(await confirm(question, true, left))) {
    console.log(`\n  ${left}`)
    return
  }
  run('git', ['push', 'origin', 'main'], 'change')
  run('git', ['push', 'origin', tag], 'change')

  if (!LOCAL) {
    console.log(`\n${bold('✔')} ${tag} is pushed. The release workflow takes it from here:`)
    console.log('  https://github.com/morzecrew/morze-ui/actions/workflows/release.yml')
    return
  }

  const scratch = mkdtempSync(join(tmpdir(), 'morze-release-'))
  const notesFile = join(scratch, 'notes.md')
  writeFileSync(notesFile, notes)
  try {
    run('gh', ['release', 'create', tag, '--title', version, '--notes-file', notesFile, '--verify-tag', '--latest'], 'change')
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }

  const npm =
    flag('npm') ||
    (!YES && (await confirm('  Publish to npm as well?', false, `The GitHub release is out; npm was not touched. Publish with: npm publish`)))
  if (npm) run('npm', ['publish'], 'change')

  console.log(`\n${bold('✔')} ${tag} is out: ${out('gh', ['release', 'view', tag, '--json', 'url', '--jq', '.url'])}`)
}

main()
  .catch((error) => fail(error.message))
  .finally(() => rl.close())
