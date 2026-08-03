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
 * --check turns it into a gate on the DECLARED window rather than on drift
 * itself, which is the distinction that keeps the deadlock above from coming
 * back. resources/engine-pin-drift.txt names the slugs the pin is knowingly
 * behind on; --check fails only when the real set differs from that file, in
 * either direction. A spec PR that puts the corpus ahead of the engine adds a
 * line there and stays green; drift nobody declared goes red the same day.
 * That is what carve#533 asked for - it found the pin three documents behind
 * with nothing reporting it, because this script ran in no CI job at all.
 *
 * Usage: node scripts/engine-report.mjs [--diff] [--check]
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, '..', 'tests/corpus')
const diffMode = process.argv.includes('--diff')
const checkMode = process.argv.includes('--check')

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

if (!checkMode) process.exit(mismatches.length || threw.length ? 1 : 0)

/*
 * --check: compare the real drift against the DECLARED drift.
 *
 * Reported in both directions on purpose. "Undeclared" is the carve#533 case,
 * drift nobody wrote down. "Stale" is the one that rots quietly the other way:
 * the pin moves, the engine catches up, and the file goes on excusing a
 * document that reproduces fine - so the next real drift on that slug is
 * pre-excused and never reported.
 */
const driftPath = resolve(here, '..', 'resources/engine-pin-drift.txt')
const declared = new Map(
  readFileSync(driftPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const at = l.search(/\s{2,}/)
      if (at === -1) throw new Error(`engine-pin-drift.txt: no reason on line: ${l}`)
      return [l.slice(0, at), l.slice(at).trim()]
    }),
)

const actual = new Set([...mismatches.map((m) => m.slug), ...threw.map((t) => t.slug)])
const undeclared = [...actual].filter((s) => !declared.has(s)).sort()
const stale = [...declared.keys()].filter((s) => !actual.has(s)).sort()

console.log(`\ndeclared drift:          ${declared.size} (resources/engine-pin-drift.txt)`)

for (const slug of undeclared) {
  console.log(`  UNDECLARED  ${slug} - the pin does not reproduce this and nothing says why`)
}
for (const slug of stale) {
  console.log(`  STALE       ${slug} - reproduces now; drop the line (reason was: ${declared.get(slug)})`)
}

if (undeclared.length || stale.length) {
  console.log(
    `\nresources/engine-pin-drift.txt does not describe this build.\n` +
      `Add a line (with the reason) for drift a spec rule just created, or delete\n` +
      `lines the pin has caught up on - in the commit that causes either.`,
  )
  process.exit(1)
}

console.log('\nDrift matches what is declared.')
process.exit(0)
