/*
 * The formatter preserves the document, over the WHOLE corpus.
 *
 * tests/corpus-roundtrip/ pins the canonical writer against ten hand-written
 * documents, chosen for their escaping decisions. That is the right shape for
 * pinning bytes, and it is a thin sample: the corpus has 500+ documents that
 * exercise every construct in the language, and none of them were ever put
 * through the writer.
 *
 * The cost of that gap is not hypothetical. carve-rs turns
 *
 *     > a
 *     >
 *     > %%%
 *     > x
 *     > %%%
 *
 * into source where the commented-out `x` renders as a visible paragraph
 * (carve-rs#432) - and the corpus ALREADY contains documents that expose it
 * (70-blocks-that-render-to-nothing and -3). They pass every gate, because the
 * HTML fixtures compare the FIRST render and nothing re-renders the formatter's
 * output. The documents were there; the property was not checked.
 *
 * Two properties, both from PART 11 §1:
 *
 *   toHtml(fmt(x)) == toHtml(x)   formatting does not change what the document
 *                                 says. This is the one that catches content
 *                                 disclosure - a writer bug that turns hidden
 *                                 text visible fails here and nowhere else.
 *
 *   fmt(fmt(x)) == fmt(x)         formatting settles. A writer that does not
 *                                 is worse than one that loses a field: every
 *                                 run produces a diff.
 *
 * This checks the REFERENCE engine only, because that is what this repo pins.
 * The same properties across the other engines are `compare:impls --roundtrip`,
 * which needs their checkouts and runs in the conformance workflow.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve, carveToHtml } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

const documents = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .map((f) => ({ slug: f.replace(/\.crv$/, ''), source: readFileSync(resolve(corpusDir, f), 'utf8') }))

test('the corpus is non-empty, so a broken glob cannot pass as a clean run', () => {
  assert.ok(documents.length > 100, `found ${documents.length} corpus documents`)
})

test('formatting never changes what a corpus document says', () => {
  const changed = []
  for (const { slug, source } of documents) {
    const formatted = carveToCarve(source)
    if (carveToHtml(formatted).trim() !== carveToHtml(source).trim()) changed.push(slug)
  }
  assert.deepEqual(
    changed,
    [],
    `these documents render differently after formatting - the writer changed the document, ` +
      `not just its spelling:\n  ${changed.join('\n  ')}`,
  )
})

test('formatting a corpus document settles on the first pass', () => {
  const unsettled = []
  for (const { slug, source } of documents) {
    const once = carveToCarve(source)
    if (carveToCarve(once) !== once) unsettled.push(slug)
  }
  assert.deepEqual(
    unsettled,
    [],
    `formatting these twice differs from formatting once, so every run produces a diff:\n  ` +
      unsettled.join('\n  '),
  )
})

/*
 * The two sweeps above assert PROPERTIES, and every canonical-writer divergence
 * found so far satisfies both of them: a comment renders nothing, so a body at
 * the wrong column keeps `to_html(fmt(x)) == to_html(x)`, and a writer is
 * happily idempotent about a spelling it picked itself. The bytes are the only
 * thing that separates one canonical form from two.
 *
 * `.fmt` files existed for that and were read by nothing (carve#671). This
 * reads them for the pinned carve-js build; the engines need the same check
 * against their own writers, which is the other half of that issue.
 */
const pinned = documents
  .map(({ slug, source }) => {
    const path = resolve(corpusDir, `${slug}.fmt`)
    return existsSync(path) ? { slug, source, expected: readFileSync(path, 'utf8') } : null
  })
  .filter(Boolean)

test('a .fmt fixture is read, so it can fail', () => {
  // Guards the sweep below against a glob that quietly matches nothing - the
  // failure mode the fixtures were already in.
  assert.ok(pinned.length >= 5, `found ${pinned.length} .fmt fixtures`)
})

test('fmt(x) matches every .fmt fixture (PART 11 §2)', () => {
  const wrong = []
  for (const { slug, source, expected } of pinned) {
    const actual = carveToCarve(source)
    if (actual !== expected) wrong.push(`${slug}\n    expected: ${JSON.stringify(expected)}\n      actual: ${JSON.stringify(actual)}`)
  }
  assert.deepEqual(wrong, [], `the writer disagrees with its pinned canonical form:\n  ${wrong.join('\n  ')}`)
})
