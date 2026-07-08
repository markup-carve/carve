/*
 * Executable-spec conformance gate.
 *
 * Pipeline (the layered formal spec, executed):
 *   1. scripts/spec/layout.mjs  - PART 0 line automaton + block structure
 *   2. resources/carve-core.ohm - PART 3 inline grammar (Ohm/PEG)
 *   3. scripts/spec/html.mjs    - PART 9R resolution + PART 10 serialization
 *
 * Buckets per corpus pair:
 *   - REFUSED       -> the input uses constructs outside the executable
 *                      subset; counted out of scope (refuse > approximate).
 *   - MATCH + SAME  -> executable-spec conformant, byte-for-byte.
 *   - MATCH + DIFF  -> a DEFECT: the executable spec claims an input it
 *                      cannot render faithfully. The gate FAILS.
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

const listMode = process.argv.includes('--list')
const diffMode = process.argv.includes('--diff')
let core = 0
const diffs = []
const refused = []

for (const f of inputs) {
  const src = readFileSync(resolve(corpusDir, f), 'utf8')
  const expected = readFileSync(resolve(corpusDir, f.replace(/\.crv$/, '.html')), 'utf8').replace(/\n$/, '')
  let got
  try {
    got = renderDoc(parse(src))
  } catch (e) {
    if (e instanceof Refuse || e.refuse) {
      refused.push(`${f}: ${e.message}`)
      continue
    }
    throw e
  }
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
process.exit(diffs.length ? 1 : 0)
