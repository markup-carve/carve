/*
 * The example source must keep at least one multi-pair `::: compare` block.
 *
 * Every repo in the fleet counts the pairs the corpus declares, and carve#2824
 * fixed those counters to count `carve` fences rather than compare blocks. On a
 * page where every block holds exactly one pair the two readings agree, so the
 * fix is correct and unwatched: the next hand-written copy of that counter is
 * wrong and green. carve#2825 split the only multi-pair block out, and nothing
 * recorded that it was the thing exercising the counters (carve#2833).
 *
 * tests/compare-block-holds-many-pairs.test.mjs pins the GENERATOR against a
 * synthetic page, which is why this repo was never affected. The satellites read
 * resources/examples/*.md, so the guard has to read those files too. A guard
 * that builds its own page would reproduce the blind spot exactly.
 *
 * Reading this fixture today:
 *   carve-py, carve-rb, carve-go, carve-wasm and the editor and CMS hosts gate a
 *   population count against the corpus; shopware-carve, symfony-carve and
 *   laravel-carve do it from scripts/DeclaredCorpusPairs.php and its siblings,
 *   driven by .github/workflows/engine-drift.yml.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { exampleFiles } from '../scripts/lib/example-sections.mjs'
import { censusComparePairs } from '../scripts/lib/example-pair-census.mjs'

const repoRoot = resolve(import.meta.dirname, '..')

const census = () => exampleFiles.flatMap((name) => {
  const path = `resources/examples/${name}.md`
  const lines = readFileSync(resolve(repoRoot, path), 'utf8').split('\n')
  return censusComparePairs(lines).map((block) => ({ ...block, path }))
})

test('the shipped example source holds a compare block of more than one pair', () => {
  const multi = census().filter((block) => block.carve > 1)
  assert.ok(
    multi.length > 0,
    'no `::: compare` block in resources/examples/*.md holds more than one `carve` fence. ' +
      'The fleet\'s population counters are measured against these pages, and with every ' +
      'block at one pair a counter that counts BLOCKS cannot be told from one that counts ' +
      'CARVE FENCES - so carve#2824 goes unwatched in carve-py, carve-rb, carve-go, ' +
      'carve-wasm, the editor and CMS hosts, and in the shopware-carve / symfony-carve / ' +
      'laravel-carve DeclaredCorpusPairs scripts. Restore the multi-pair block instead of ' +
      'relaxing this check (carve#2833).',
  )
})

test('counting blocks and counting carve fences disagree on the example source', () => {
  // The disagreement IS the fixture. Equal totals mean a counter can be wrong
  // about which it counts and still pass every gate in the fleet.
  const blocks = census()
  const pairs = blocks.reduce((total, block) => total + block.carve, 0)
  assert.notEqual(
    blocks.length,
    pairs,
    `blocks (${blocks.length}) and carve fences (${pairs}) agree, so neither reading is tested`,
  )
  assert.ok(pairs > blocks.length, `${pairs} carve fences across ${blocks.length} blocks`)
})

test('no compare block in the example source is left unclosed', () => {
  // The census reports an unclosed block rather than throwing, and an unclosed
  // block would also satisfy the pair count above.
  assert.deepEqual(census().filter((block) => block.unclosed), [])
})

test('every pair in the example source has both of its fences', () => {
  const lopsided = census()
    .filter((block) => block.carve !== block.html)
    .map((block) => `${block.path}:${block.line} carve=${block.carve} html=${block.html}`)
  assert.deepEqual(lopsided, [])
})
