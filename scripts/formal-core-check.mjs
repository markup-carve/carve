/*
 * Executable-spec conformance gate.
 *
 * Pipeline (the layered formal spec, executed):
 *   1. scripts/spec/layout.mjs  - PART 0 line automaton + block structure
 *   2. resources/carve-core.ohm - PART 3 inline grammar (Ohm/PEG)
 *   3. scripts/spec/html.mjs    - PART 9R resolution + PART 10 serialization
 *
 * SCOPE: this pipeline is a corpus ORACLE, run only on the trusted pinned
 * corpus - it is not an untrusted-input parser. Pathological nesting now Refuses
 * (grammar.ebnf §26 MAX_NESTING_DEPTH), but one super-linear case remains by
 * design: a long run of unclosed emphasis openers (e.g. `/x ` repeated) is O(n^2)
 * here because the inline PEG backtracks. §26's linear-time guarantee is the
 * production ENGINES' contract (carve-js/php/rs enforce it, verified in their own
 * suites); the oracle does not re-implement it. Do not feed this untrusted input.
 *
 * Buckets per corpus pair:
 *   - REFUSED       -> the input uses constructs outside the executable
 *                      subset; counted out of scope (refuse > approximate).
 *   - MATCH + SAME  -> executable-spec conformant, byte-for-byte.
 *   - MATCH + DIFF  -> a DEFECT: the executable spec claims an input it
 *                      cannot render faithfully. The gate FAILS.
 *
 * REFUSAL RATCHET: the set of refused inputs is pinned to REFUSED_ALLOW below.
 * The gate FAILS if the actual refused set differs in EITHER direction:
 *   - a NEW refusal not in the allowlist  -> a construct escaped the executable
 *     spec (a regression); either extend the spec to cover it, or (deliberately)
 *     add it to the allowlist.
 *   - a STALE allowlist entry that now renders -> the allowlist is out of date;
 *     remove the entry so the ratchet keeps its grip.
 * This locks in coverage: once an input is conformant it can never silently
 * regress to REFUSED. The allowlist is empty because every corpus input is
 * currently inside the executable subset.
 *
 * Usage: node scripts/formal-core-check.mjs [--list] [--diff]
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, Refuse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const corpusDir = resolve(repo, 'tests/corpus')
const inputs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()

// Committed allowlist of inputs permitted to be REFUSED (basenames, no
// extension). Empty: every corpus input is inside the executable subset.
const REFUSED_ALLOW = new Set([])

const listMode = process.argv.includes('--list')
const diffMode = process.argv.includes('--diff')
let core = 0
const diffs = []
const refused = []
const refusedNames = new Set()
// The oracle must never let an internal pipeline frame reach output: the LAZY
// line marker (U+0000 'L' U+0000) or the resolution sentinels U+E000 / U+E001 /
// U+0002. A leak corrupts the ground truth (and would be a sentinel-injection
// hazard in a shipping engine). Checked over the whole corpus below.
const SENTINELS = /[\u0000\u0002\uE000\uE001]/
const leaks = []

for (const f of inputs) {
  const src = readFileSync(resolve(corpusDir, f), 'utf8')
  const expected = readFileSync(resolve(corpusDir, f.replace(/\.crv$/, '.html')), 'utf8').replace(/\n$/, '')
  let got
  try {
    got = renderDoc(parse(src))
  } catch (e) {
    if (e instanceof Refuse || e.refuse) {
      refused.push(`${f}: ${e.message}`)
      refusedNames.add(f.replace(/\.crv$/, ''))
      continue
    }
    throw e
  }
  if (SENTINELS.test(got)) leaks.push(f)
  if (got === expected) {
    core++
    if (listMode) console.log(`CORE  ${f}`)
  } else {
    diffs.push({ f, got, expected })
  }
}

console.log(`\ncorpus inputs:               ${inputs.length}`)
console.log(`executable-spec conformant:  ${core}`)
console.log(`refused (out of subset):     ${refused.length}`)
console.log(`DEFECTS (parse but diff):    ${diffs.length}`)
console.log(`SENTINEL LEAKS (framing in out): ${leaks.length}`)
for (const f of leaks) console.log(`  ! ${f}`)
for (const d of diffs) {
  console.log(`\n--- ${d.f}`)
  if (diffMode) {
    console.log(`expected:\n${d.expected}`)
    console.log(`got:\n${d.got}`)
  }
}
if (diffMode) {
  for (const r of refused.slice(0, 400)) console.log(`REFUSED ${r}`)
}

// --- refusal ratchet: actual refused set must equal REFUSED_ALLOW -----------
const newlyRefused = [...refusedNames].filter((n) => !REFUSED_ALLOW.has(n)).sort()
const staleAllowed = [...REFUSED_ALLOW].filter((n) => !refusedNames.has(n)).sort()
let ratchetFail = false
if (newlyRefused.length) {
  ratchetFail = true
  console.log(`\nRATCHET FAILURE: ${newlyRefused.length} input(s) newly REFUSED (a construct escaped the executable spec):`)
  for (const n of newlyRefused) console.log(`  + ${n}`)
  console.log('  -> cover it in the executable spec, or add it to REFUSED_ALLOW deliberately.')
}
if (staleAllowed.length) {
  ratchetFail = true
  console.log(`\nRATCHET FAILURE: ${staleAllowed.length} stale REFUSED_ALLOW entry/entries now render (remove them):`)
  for (const n of staleAllowed) console.log(`  - ${n}`)
}

process.exit(diffs.length || leaks.length || ratchetFail ? 1 : 0)
