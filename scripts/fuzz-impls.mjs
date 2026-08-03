/*
 * Differential fuzzing across the engines.
 *
 * The corpus covers what someone thought to write down. This covers what nobody
 * did: documents assembled at random from block openers, markers and delimiters,
 * rendered through carve-js, carve-rs and carve-php, and compared.
 *
 * It has found, in one afternoon, five content-loss defects that every existing
 * gate passed - 531 corpus documents against five targets in three engines,
 * plus the AST conformance checker and the formatter round trip, all green:
 *
 *   carve-rs#451   `[]: u` consumed as a definition; the line vanished
 *   carve-rs#451   `[]]: u`, `[a]b]: u` - the same, one step out, after the
 *                  first fix (found by re-running this with a new seed)
 *   carve-rs#452   a lazy continuation escaped a nested blockquote
 *   carve-js#537   `</#h>{i}` dropped the attribute block
 *   carve-php#638  `{}{x}` rendered nothing at all
 *
 * SHRINKING is what makes a finding usable. Random fragment soup is not
 * filable; the same divergence reduced to two lines is. Every reported case is
 * shrunk line-by-line and then character-by-character for as long as the
 * divergence survives.
 *
 * DETERMINISTIC. A seed reproduces a run exactly, so a finding can be handed to
 * someone else as `--seed=N`.
 *
 * NOT A GATE, deliberately. Measured against all three engines at main on
 * 2026-08-03, adversarial input still diverges on roughly a fifth of generated
 * documents (43 of 200 on seed 101). Wiring that into CI would produce a job
 * that is permanently red, and a permanently red job gets muted - which is the
 * failure mode this repo has spent a lot of effort removing. Run it, shrink
 * what it finds, file that. See carve#510 for the standing count.
 *
 *   node scripts/fuzz-impls.mjs --seed=1 --count=200
 *   node scripts/fuzz-impls.mjs --seed=7 --count=60 --max-findings=3
 *
 * Exit codes: 0 clean, 1 divergences found, 2 could not run (engines missing) -
 * because a fuzzer that reports success having rendered nothing is worse than
 * no fuzzer.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustDir } from './lib/engine-locations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')

const numeric = (flag, fallback) => {
  const arg = process.argv.find((a) => a.startsWith(`--${flag}=`))
  return arg ? Number(arg.slice(flag.length + 3)) : fallback
}
const seed = numeric('seed', 1)
const count = numeric('count', 200)
const maxFindings = numeric('max-findings', 8)

/**
 * Fragments biased toward where the corpus is thin: container openers and
 * closers of varying width, markers at odd columns, delimiters that may or may
 * not pair, and whitespace that moves a content column.
 */
const FRAGMENTS = [
  '::: note', '::::', ':::', '::: |', '{.x}', '{#i}', '{', '{}',
  '> ', '>> ', '- ', '* ', '1. ', '. ', ':: t', ':  d',
  '| a | b |', '|---|---|', '^ cap', '%%', '%%%', '```', '``` x',
  '~~~', '$`x`', '!`z`', '[l](u)', '[r][d]', '[d]: u', '*[A]: b',
  '</#h>', '^[fn]', '[^f]', '[^f]: t', '#tag', '@user', '\t', '  ',
  'text', '/i/', '*b*', '_u_', '~s~', '---', '# H',
]

let state = seed >>> 0 || 1
const rnd = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
const pick = (xs) => xs[Math.floor(rnd() * xs.length)]

const generate = () => {
  const lines = 1 + Math.floor(rnd() * 8)
  return (
    Array.from({ length: lines }, () => {
      const n = 1 + Math.floor(rnd() * 3)
      return Array.from({ length: n }, () => pick(FRAGMENTS)).join(rnd() < 0.5 ? '' : ' ')
    }).join('\n') + '\n'
  )
}

const rustBinary = (() => {
  const dir = rustDir()
  if (!dir) return null
  for (const c of ['target/release/carve', 'target/debug/carve']) {
    if (existsSync(join(dir, c))) return join(dir, c)
  }
  return null
})()
const phpBinary = phpDir() && existsSync(join(phpDir(), 'bin/carve')) ? join(phpDir(), 'bin/carve') : null
const jsEntry = existsSync(join(jsDir, 'dist/index.js')) ? join(jsDir, 'dist/index.js') : null

const missing = [!jsEntry && 'carve-js', !rustBinary && 'carve-rs', !phpBinary && 'carve-php'].filter(Boolean)
if (missing.length) {
  console.error(`fuzz-impls: need all three engines built, missing ${missing.join(', ')}.`)
  console.error('A fuzzer that reports success having rendered nothing is worse than no fuzzer.')
  process.exit(2)
}

const lib = await import(jsEntry)
const tmp = mkdtempSync(join(tmpdir(), 'carve-fuzz-'))
const file = join(tmp, 'case.crv')

const cli = (bin) => {
  try {
    return execFileSync(bin, ['--html', file], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 10000 }).trim()
  } catch (error) {
    return `ERROR: ${String(error.message).split('\n')[0].slice(0, 90)}`
  }
}

function render(source) {
  writeFileSync(file, source)
  let js
  try {
    js = lib.carveToHtml(source).trim()
  } catch (error) {
    js = `ERROR: ${String(error.message).slice(0, 90)}`
  }
  return { js, rs: cli(rustBinary), php: cli(phpBinary) }
}

const diverges = (source) => {
  const { js, rs, php } = render(source)
  return js !== rs || js !== php
}

/** Line-level shrink, then character-level, while the divergence survives. */
function shrink(source) {
  let current = source
  for (let changed = true; changed; ) {
    changed = false
    const lines = current.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''))
    for (let i = 0; i < lines.length; i++) {
      const candidate = lines.filter((_, j) => j !== i).join('\n') + '\n'
      if (candidate.trim() && diverges(candidate)) {
        current = candidate
        changed = true
        break
      }
    }
    if (changed) continue
    for (let i = 0; i < current.length; i++) {
      const candidate = current.slice(0, i) + current.slice(i + 1)
      if (candidate.trim() && diverges(candidate)) {
        current = candidate
        changed = true
        break
      }
    }
  }
  return current
}

const seen = new Set()
const findings = []
let generated = 0
let diverged = 0

try {
  for (let i = 0; i < count && findings.length < maxFindings; i++) {
    const source = generate()
    generated++
    if (!diverges(source)) continue
    diverged++
    const minimal = shrink(source)
    const key = minimal.trim()
    if (seen.has(key)) continue
    seen.add(key)
    findings.push({ minimal, ...render(minimal) })
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

const squash = (html) => html.replace(/\s+/g, ' ').trim()

for (const f of findings) {
  console.log('=== minimal reproducer')
  console.log(f.minimal.replace(/\n$/, '').split('\n').map((l) => `    ${l}`).join('\n'))
  console.log(`  js : ${squash(f.js).slice(0, 160)}`)
  if (f.rs !== f.js) console.log(`  rs : ${squash(f.rs).slice(0, 160)}`)
  if (f.php !== f.js) console.log(`  php: ${squash(f.php).slice(0, 160)}`)
  console.log('')
}

console.log(
  `seed=${seed} generated=${generated} diverged=${diverged} distinct_minimal=${findings.length}`,
)
if (findings.length > 0) {
  console.error(
    `\n${findings.length} distinct divergence(s). Reproduce with --seed=${seed} --count=${count}.`,
  )
  process.exit(1)
}
console.log('No divergences.')
