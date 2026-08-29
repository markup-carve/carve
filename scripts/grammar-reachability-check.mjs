/*
 * Corpus coverage of the executable grammar, in the direction nothing measured.
 *
 * `core:check` asks whether the grammar covers the corpus. This asks the
 * reverse: whether the corpus reaches every production the grammar declares.
 * A rule nothing exercises is a check that cannot fail - it can be widened,
 * narrowed or emptied and every existing gate stays green (carve#1850).
 *
 * The answer is pinned in resources/grammar-corpus-coverage.txt and this fails
 * in both directions, so a new unreached production and a stale entry are each
 * a red run rather than a number nobody reads.
 *
 * Usage: node scripts/grammar-reachability-check.mjs [--list]
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'
import { classifyRules, recordReachedRules } from './spec/grammar-reach.mjs'
import { shortfall } from './spec/participants.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const corpusDir = resolve(repo, 'tests/corpus')
const ledgerPath = resolve(repo, 'resources/grammar-corpus-coverage.txt')

const grammar = ohm.grammar(readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8'))
const declared = new Set(Object.keys(grammar.rules))

const KINDS = new Set(['GAP', 'LOOKAHEAD', 'ORPHAN'])
const ledger = new Map()
for (const line of readFileSync(ledgerPath, 'utf8').split('\n')) {
  const row = line.trim()
  if (!row || row.startsWith('#')) continue
  const [rule, kind] = row.split(/\s+/)
  if (!KINDS.has(kind)) {
    console.error(`${ledgerPath}: "${rule}" has kind "${kind}", which is not one of ${[...KINDS].join(', ')}`)
    process.exit(2)
  }
  ledger.set(rule, kind)
}

const staleNames = [...ledger.keys()].filter((r) => !declared.has(r)).sort()
if (staleNames.length) {
  console.error(`the ledger names ${staleNames.length} rule(s) the grammar no longer declares: ${staleNames.join(', ')}`)
  console.error('Renamed or removed? An entry for a rule that is gone pins nothing.')
  process.exit(2)
}

const { positive, lookaheadOnly, orphans } = classifyRules(grammar)

const inputs = readdirSync(corpusDir).filter((f) => f.endsWith('.crv')).sort()
const population = shortfall({
  label: 'CORPUS',
  actual: inputs.length,
  atLeast: 100,
  of: 'document(s)',
  hint: 'Run `npm run corpus:build`, or check the checkout.',
})
if (population !== null) {
  console.error(population)
  console.error('Nothing below describes the corpus this repository ships.')
  process.exit(2)
}

const { reached, counts, restore } = recordReachedRules(declared)
// Imported after the patch is installed: render.mjs builds its grammar at module
// load, and the four matches it runs are the whole inline half of the measurement.
const { parse, Refuse } = await import('./spec/layout.mjs')
const { renderDoc } = await import('./spec/html.mjs')

for (const file of inputs) {
  const src = readFileSync(resolve(corpusDir, file), 'utf8')
  try {
    renderDoc(parse(src))
  } catch (e) {
    if (!(e instanceof Refuse || e.refuse)) throw e
  }
  grammar.match(src, 'doc')
}
restore()

/*
 * A hook that stopped firing reports every rule as unreached, which the ratchet
 * below would show as a wall of new findings rather than as the instrumentation
 * being broken. Say which it is.
 */
if (counts.walked === 0) {
  console.error(`INSTRUMENTATION DEAD: ${counts.matched} match(es) ran and none yielded a CST to walk.`)
  console.error('Nothing below is a measurement of the corpus.')
  process.exit(2)
}

const unreached = [...positive].filter((r) => !reached.has(r)).sort()
const expectedGaps = [...ledger].filter(([, k]) => k === 'GAP').map(([r]) => r).sort()
const expectedLookahead = [...ledger].filter(([, k]) => k === 'LOOKAHEAD').map(([r]) => r).sort()
const expectedOrphans = [...ledger].filter(([, k]) => k === 'ORPHAN').map(([r]) => r).sort()
const actualLookahead = [...lookaheadOnly].sort()
const actualOrphans = [...orphans].sort()

if (process.argv.includes('--list')) {
  for (const rule of [...declared].sort()) {
    const kind = orphans.has(rule)
      ? 'ORPHAN'
      : lookaheadOnly.has(rule)
        ? 'LOOKAHEAD'
        : reached.has(rule)
          ? 'reached'
          : 'UNREACHED'
    console.log(`${kind.padEnd(10)} ${rule}`)
  }
}

console.log(`\ncorpus documents:            ${inputs.length}`)
console.log(`declared productions:        ${declared.size}`)
console.log(`positively reachable:        ${positive.size}`)
console.log(`reached by the corpus:       ${reached.size}`)
console.log(`UNREACHED (declared gaps):   ${unreached.length}`)
console.log(`lookahead-only (no node):    ${actualLookahead.length}`)
console.log(`orphans (no caller at all):  ${actualOrphans.length}`)

let failed = false
const report = (title, extra, missing, advice) => {
  if (extra.length) {
    failed = true
    console.log(`\n${title}: ${extra.length} not in the ledger:`)
    for (const r of extra) console.log(`  + ${r}`)
    console.log(`  -> ${advice}`)
  }
  if (missing.length) {
    failed = true
    console.log(`\n${title}: ${missing.length} stale ledger entry/entries:`)
    for (const r of missing) console.log(`  - ${r}`)
    console.log('  -> delete the line; it no longer describes the grammar.')
  }
}

report(
  'UNREACHED PRODUCTIONS',
  unreached.filter((r) => !expectedGaps.includes(r)),
  expectedGaps.filter((r) => !unreached.includes(r)),
  'add a corpus document that exercises it, or declare it with the spelling that would.',
)
report(
  'LOOKAHEAD-ONLY SET',
  actualLookahead.filter((r) => !expectedLookahead.includes(r)),
  expectedLookahead.filter((r) => !actualLookahead.includes(r)),
  'a rule that moved into lookahead-only position leaves the coverage question; declare it deliberately.',
)
report(
  'ORPHAN PRODUCTIONS',
  actualOrphans.filter((r) => !expectedOrphans.includes(r)),
  expectedOrphans.filter((r) => !actualOrphans.includes(r)),
  'nothing references it, so no document can reach it by any path: give it a caller or delete it.',
)

process.exit(failed ? 1 : 0)
