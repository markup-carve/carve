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
 *     The tree those invariants are compared over is the PUBLISHED one -
 *     `toAstJson(parse(x))`, the PART 12 shape - never the engine's internal
 *     `parse()` return. An internal tree carries fields PART 12 never declares
 *     and `resources/ast-schema.json` never lists, and those fields record
 *     where a node was WRITTEN: `footnoteDefPos` on the root,
 *     `termSpans` / `definitionSpans` / `definitionLines` on a definition-list
 *     item. Moving nodes is most of what the writer does, so comparing them
 *     reports a difference for every document whose definitions the writer
 *     hoists or whose blocks it re-separates - 74 of the 1371 corpus documents,
 *     none of which says anything different afterwards (carve#1616). This file
 *     was green on that reading only because none of its 12 documents had a
 *     definition list and only one had a footnote definition; `13` and `14`
 *     below close that hole.
 *
 *   - The BYTES (PART 11 §2, §4) pin the escaping decision itself. They were
 *     skipped while no engine implemented minimal escaping; the pinned carve-js
 *     build does now (carve-js#397), and it reproduces them exactly apart from
 *     the two conservative-form cases noted below. The fixtures were derived
 *     from PART 11 rather than from any writer's output, so this is a check of
 *     the engine against the spec, not of the engine against itself.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve, parse, toAstJson } from '@markup-carve/carve'

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

/*
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt and the html-import contract, and it fails in
 * both directions. A `.expected.crv` states what PART 11 REQUIRES, derived from
 * the spec rather than from any writer's output, so a fixture ahead of the
 * pinned build is the fixture being right and the build being behind. The
 * declaration says which, and names why; a listed case the build now
 * reproduces is red too, so the line goes out with the pin bump that fixed it.
 *
 * Both assertions that read the pinned build are covered, because a build that
 * disagrees about what canonical LOOKS LIKE also disagrees about what the
 * canonical bytes MEAN: `: def` is a definition body to the spec and a stray
 * paragraph to a build that has not shipped the one-space separator.
 */
const PIN_LAG = new Map([
  [
    '13-definition-list-after-a-list',
    'writes and reads the two-space definition separator; one space is canonical (carve#1757)',
  ],
])
const reproduced = []

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

/*
 * Drop the recorded source positions.
 *
 * `pos` and `srcByteLength` record WHERE a node was written, which legitimately
 * moves when the writer renormalizes indentation, so neither is part of "same
 * document".
 */
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
  const comparable = (src) => mergeTextRuns(withoutPositions(toAstJson(parse(src))))

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
    if (PIN_LAG.has(slug)) return
    assert.deepEqual(
      comparable(expected),
      comparable(source),
      'the expected output is not a faithful serialization of the input',
    )
  })

  test(`${slug}: fmt(x) == expected bytes (PART 11 §2)`, () => {
    if (PIN_LAG.has(slug)) {
      assert.notEqual(
        carveToCarve(source),
        expected,
        `${slug} is declared as pin lag ("${PIN_LAG.get(slug)}") but the pinned ` +
          'build now reproduces it. Delete the entry, in the commit that moved the pin.',
      )
      reproduced.push(slug)
      return
    }
    assert.equal(carveToCarve(source), expected)
  })
}

test('a declared pin lag names a case that is still behind', () => {
  assert.deepEqual(
    [...PIN_LAG.keys()].sort(),
    reproduced.sort(),
    'a declared pin lag names a round-trip case that does not exist',
  )
})
