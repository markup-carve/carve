#!/usr/bin/env node
/*
 * Property check for the canonical writer (PART 11).
 *
 * The corpus pins documents somebody wrote. This generates documents nobody
 * wrote, from an alphabet of construct fragments, and asserts the two PART 11
 * invariants over them:
 *
 *   to_html(fmt(x)) == to_html(x)     meaning is preserved
 *   fmt(fmt(x))     == fmt(x)         the writer is idempotent
 *
 * plus, when sibling engine checkouts are present, that the three canonical
 * writers agree byte-for-byte.
 *
 * It exists because the corpus structurally cannot reach some shapes. Generated
 * documents combine constructs at indentations a human would not type, and that
 * is exactly where the writer's normalization changes meaning. The first run of
 * this script found 48 invariant failures and 41 cross-engine divergences that
 * a year of corpus testing had not.
 *
 * Deterministic: the seed is fixed, so a failure is reproducible and a run is
 * comparable against another build. Pass --seed=N to explore elsewhere.
 *
 *   node scripts/property-check.mjs [--count=800] [--seed=12345] [--engines]
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const count = Number(arg('count', 800))
const compareEngines = process.argv.includes('--engines')

let seed = Number(arg('seed', 12345))
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
const pick = (a) => a[Math.floor(rnd() * a.length)]

// Construct fragments, deliberately including the escape forms and the
// block openers, since the interesting failures come from their combinations
// at unusual indentation rather than from any one of them alone.
const ATOMS = [
  'word', 'a', '  ', '\n', '\n\n', '"q"', "'s", '...', '--', '---', '->', '<-', '=>',
  '(c)', '+-', '\\-\\-', '\\.', '\\"', '\\^', '\\#', '\\@', '[t](u)', '[t][r]', '`c`',
  '*b*', '/i/', '_u_', '~s~', '=h=', '{.cls}', '^[fn]', '@user', '#tag', ':name:',
  '- item', '# head', '> quote', '| a | b |', '::: note', ':::', '%% c', ':: term',
  '1. x', 'a) y', '$m$', '!img', '![a](/u)', '^ cap', '\\ ', '10\\ kg', '{^x^}', '{,y,}',
]

function generate() {
  const len = 1 + Math.floor(rnd() * 8)
  return Array.from({ length: len }, () => pick(ATOMS)).join(rnd() < 0.4 ? ' ' : '\n') + '\n'
}

const lib = await import(resolve(root, 'docs/.vitepress/carve-lib/index.js'))

const docs = Array.from({ length: count }, generate)
const failures = { idempotence: [], meaning: [], threw: [] }

for (const src of docs) {
  try {
    const once = lib.carveToCarve(src)
    const twice = lib.carveToCarve(once)
    if (once !== twice) failures.idempotence.push(src)
    else if (lib.carveToHtml(once) !== lib.carveToHtml(src)) failures.meaning.push(src)
  } catch (error) {
    failures.threw.push([src, error.message])
  }
}

console.log(`generated ${docs.length} documents (seed ${arg('seed', 12345)})`)
console.log(`  idempotence failures : ${failures.idempotence.length}`)
console.log(`  meaning changed      : ${failures.meaning.length}`)
console.log(`  threw                : ${failures.threw.length}`)

for (const [label, list] of [['IDEMPOTENCE', failures.idempotence], ['MEANING', failures.meaning]]) {
  for (const src of list.slice(0, 3)) console.log(`  ${label} ${JSON.stringify(src)}`)
}

if (compareEngines) {
  // Sibling checkouts, same convention as scripts/compare-impls.mjs.
  const engines = [
    ['rust', process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs'), (f) => execFileSync(resolve(root, '../carve-rs/target/release/carve'), ['--carve', f], { encoding: 'utf8' })],
    ['js', process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), (f) => execFileSync('node', [resolve(root, '../carve-js/dist/cli.js'), '--carve', f], { encoding: 'utf8' })],
    ['php', process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php'), (f) => execFileSync('php', [resolve(root, '../carve-php/bin/carve'), '--carve', f], { encoding: 'utf8' })],
  ]

  const dir = resolve(tmpdir(), 'carve-property-check')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  let diffs = 0
  docs.forEach((src, i) => {
    const file = resolve(dir, `g${String(i).padStart(4, '0')}.crv`)
    writeFileSync(file, src)
    const outputs = engines.map(([name, , run]) => {
      try {
        return [name, run(file)]
      } catch {
        return [name, 'ERROR']
      }
    })
    if (new Set(outputs.map(([, out]) => out)).size > 1) diffs++
  })
  console.log(`  cross-engine --carve divergences: ${diffs}`)
  rmSync(dir, { recursive: true, force: true })
}

// Reporting only: these invariants do not hold across the board today
// (markup-carve/carve#359), so failing the build here would just be noise. The
// value is the count, compared against another build of the same engine.
