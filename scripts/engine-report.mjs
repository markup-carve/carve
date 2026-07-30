#!/usr/bin/env node
/*
 * Report how the pinned `@markup-carve/carve` build compares to the corpus.
 *
 * This is a REPORT, not a gate. Corpus conformance is gated by the executable
 * spec (`npm test` + `npm run core:check`) so a spec PR can prove its fixtures
 * are self-consistent without waiting for an engine to ship the rule, and each
 * engine gates ITSELF against this corpus through its own spec submodule.
 *
 * What this is for: before moving the pin (`npm run bump-carve-pin`), see what
 * the new build changes; and after a spec rule lands, see which cases the
 * reference build has not caught up on yet. Exits non-zero when anything
 * mismatches, so it is usable on demand or in a non-blocking job - just do not
 * wire it into the blocking gates, or the deadlock it exists to document comes
 * straight back.
 *
 * Usage: node scripts/engine-report.mjs [--diff]
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, '..', 'tests/corpus')
const diffMode = process.argv.includes('--diff')

const slugs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .map((f) => basename(f, '.crv'))
  .sort()

const mismatches = []
const threw = []

for (const slug of slugs) {
  const crv = readFileSync(resolve(corpusDir, `${slug}.crv`), 'utf8')
  const expected = readFileSync(resolve(corpusDir, `${slug}.html`), 'utf8').trim()
  let got
  try {
    got = carveToHtml(crv).trim()
  } catch (e) {
    threw.push({ slug, message: e.message })
    continue
  }
  if (got !== expected) mismatches.push({ slug, got, expected })
}

const pin = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'))
  .devDependencies['@markup-carve/carve']

console.log(`\npinned reference build:  ${pin}`)
console.log(`corpus pairs:            ${slugs.length}`)
console.log(`reproduced:              ${slugs.length - mismatches.length - threw.length}`)
console.log(`mismatched:              ${mismatches.length}`)
console.log(`threw:                   ${threw.length}`)

for (const t of threw) console.log(`  ! ${t.slug}: ${t.message}`)
for (const m of mismatches) {
  console.log(`\n--- ${m.slug}`)
  if (diffMode) {
    console.log(`expected:\n${m.expected}`)
    console.log(`got:\n${m.got}`)
  }
}

if (mismatches.length || threw.length) {
  console.log(
    `\nThe pinned build disagrees with the corpus on ${mismatches.length + threw.length} input(s).\n` +
      `Expected right after a spec rule lands: the engine has not shipped it yet.\n` +
      `Otherwise bump the pin (npm run bump-carve-pin) or fix the engine.`,
  )
}

process.exit(mismatches.length || threw.length ? 1 : 0)
