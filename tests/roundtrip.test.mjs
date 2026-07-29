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
 *     carve-lib does now (carve-js#397), and it reproduces them exactly apart
 *     from the two conservative-form cases noted below. The fixtures were derived from PART 11 rather than from any
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

/**
 * Collapse adjacent text and escaped-text runs into one text node.
 *
 * PART 11 §1 states the invariant's equality as being MODULO ESCAPING, and this
 * is what that means in practice. Escaping a character both retypes the node and
 * SPLITS the run it sat in - `escaped.` is one text node, `escaped\.` is a text
 * node plus an escaped-text node - so a raw AST comparison reports a difference
 * for every escape the writer emitted, which is the one thing these fixtures are
 * pinning. Both engines' W3 comparison normalizes the same way.
 */
function mergeTextRuns(node) {
  if (Array.isArray(node)) {
    const merged = []
    for (const child of node.map(mergeTextRuns)) {
      const isText = child && (child.type === 'text' || child.type === 'escaped_text')
      const previous = merged[merged.length - 1]
      if (isText && previous && previous.type === 'text') {
        previous.value = `${previous.value}${child.value}`
        continue
      }
      merged.push(isText ? { ...child, type: 'text' } : child)
    }
    return merged
  }
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = mergeTextRuns(v)
    return out
  }
  return node
}

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
  const comparable = (src) => mergeTextRuns(withoutPositions(parse(src)))

  test(`${slug}: parse(fmt(x)) == parse(x)`, () => {
    assert.deepEqual(
      comparable(carveToCarve(source)),
      comparable(source),
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
      comparable(expected),
      comparable(source),
      'the expected output is not a faithful serialization of the input',
    )
  })

  test(`${slug}: fmt(x) == expected bytes (PART 11 §2)`, () => {
    assert.equal(carveToCarve(source), expected)
  })
}
