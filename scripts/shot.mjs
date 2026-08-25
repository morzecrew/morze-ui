/**
 * Regenerates docs/screenshot.png — the still in the README.
 *
 *   npm run shot            (with `npm run dev` already running, or it starts one)
 *
 * The page is playground/shot.html; Chrome renders it headless at 2x, so the
 * picture can be redone whenever the look changes instead of being re-composed
 * by hand. The capture is trimmed to the content, so the frame does not depend
 * on how tall the columns happen to be.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.SHOT_URL ?? 'http://localhost:5250/shot.html'
const out = resolve(root, 'docs/screenshot.png')
const scale = 2
const width = 1366
const height = 900 // captured tall, then trimmed to the content

const chrome = ['/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
  (p) => existsSync(p)
)
if (!chrome) {
  console.error('No Chrome found — set one of the usual paths or capture by hand.')
  process.exit(1)
}

const reachable = await fetch(url).then(
  (r) => r.ok,
  () => false
)
let dev
if (!reachable) {
  console.log('starting the playground…')
  dev = spawn('npm', ['run', 'dev'], { cwd: root, stdio: 'ignore', detached: true })
  for (let i = 0; i < 40; i++) {
    if (await fetch(url).then((r) => r.ok, () => false)) break
    await new Promise((r) => setTimeout(r, 250))
  }
}

const profile = mkdtempSync(join(tmpdir(), 'morze-shot-'))
const raw = join(profile, 'raw.png')
execFileSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    // Long enough for the webfont: without it the metrics fall back and the
    // columns come out a different height than they do in a real browser.
    '--virtual-time-budget=10000',
    `--screenshot=${raw}`,
    url,
  ],
  { stdio: 'ignore' }
)

execFileSync('python3', [
  '-c',
  `
import sys
from PIL import Image, ImageChops
image = Image.open(${JSON.stringify(raw)}).convert('RGB')
background = Image.new('RGB', image.size, image.getpixel((2, 2)))
box = ImageChops.difference(image, background).getbbox()
pad = 24 * ${scale}
bottom = min(image.height, (box[3] if box else image.height) + pad)
image.crop((0, 0, image.width, bottom)).save(${JSON.stringify(out)}, optimize=True)
print('%dx%d' % (image.width, bottom))
`,
])

rmSync(profile, { recursive: true, force: true })
if (dev) process.kill(-dev.pid)
console.log(`docs/screenshot.png written from ${url}`)
