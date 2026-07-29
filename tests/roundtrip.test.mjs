/*
 * Canonical-writer round-trip corpus (PART 11).
 *
 * Each case is a `.crv` input paired with a `.expected.crv` holding the output
 * PART 11 requires: the minimal-escape form where it re-parses identically, the
 * conservative form where it does not.
 *
 * Two things are asserted separately, on purpose:
 *
 *   - The INVARIANTS (PART 11 §1) guard against a writer that changes meaning -
 *     the class of bug that shipped in carve-rs as a nested list being
 *     reformatted from tight to loose (carve-rs#286).
 *
 *   - The BYTES (PART 11 §2, §4) pin the escaping decision itself. They were
 *     skipped while no engine implemented minimal escaping; the vendored
 *     carve-lib does now (carve-js#397), and it reproduces all seven fixtures
 *     exactly. The fixtures were derived from PART 11 rather than from any
 *     writer's output, so this is a check of the engine against the spec, not
 *     of the engine against itself.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve, parse } from '../docs/.vitepress/carve-lib/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const dir = resolve(here, 'corpus-roundtrip')

const cases = readdirSync(dir)
  .filter((f) => f.endsWith('.crv') && !f.endsWith('.expected.crv'))
  .sort()
  .map((f) => ({
    slug: basename(f, '.crv'),
    source: readFileSync(resolve(dir, f), 'utf8'),
    expected: readFileSync(resolve(dir, `${basename(f, '.crv')}.expected.crv`), 'utf8'),
  }))

test('the round-trip corpus is non-empty', () => {
  assert.ok(cases.length >= 6, `found ${cases.length} cases`)
})

// `pos` records source offsets, which legitimately move when the writer
// renormalizes indentation, so it is not part of "same document".
function withoutPositions(node) {
  if (Array.isArray(node)) return node.map(withoutPositions)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      if (k === 'pos' || k === 'srcByteLength') continue
      out[k] = withoutPositions(v)
    }
    return out
  }
  return node
}

for (const { slug, source, expected } of cases) {
  test(`${slug}: parse(fmt(x)) == parse(x)`, () => {
    assert.deepEqual(
      withoutPositions(parse(carveToCarve(source))),
      withoutPositions(parse(source)),
      'the formatter changed what the document says',
    )
  })

  test(`${slug}: fmt is idempotent`, () => {
    const once = carveToCarve(source)
    assert.equal(carveToCarve(once), once, 'a second pass changed the output')
  })

  test(`${slug}: the expected output re-parses to the same document`, () => {
    // Guards the fixtures themselves: an expected file that does not round-trip
    // would pin a writer that corrupts documents.
    assert.deepEqual(
      withoutPositions(parse(expected)),
      withoutPositions(parse(source)),
      'the expected output is not a faithful serialization of the input',
    )
  })

  test(`${slug}: fmt(x) == expected bytes (PART 11 §2, §4)`, () => {
    assert.equal(carveToCarve(source), expected)
  })
}
