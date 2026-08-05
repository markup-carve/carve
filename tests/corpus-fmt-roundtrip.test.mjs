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
import { parse as oracleParse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { REFUSED_ALLOW } from '../scripts/spec/refused-allow.mjs'

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

/*
 * THE CROSS-READ. Everything above asks the writing engine to read its own
 * output, and self-consistency is all that measures: a writer that emits a form
 * only its own parser accepts passes every one of them.
 *
 * That is not hypothetical. All three engines wrote a footnote body at three
 * spaces; carve-js's parser reads blocks there, so its round trip was green,
 * while carve-rs and carve-php broke on their own output (carve#709). And all
 * three wrote a lone table span marker GLUED to the pipe, where `<` is also the
 * left-alignment sigil - `|<|` is a colspan to every engine and an alignment
 * marker to the reader below (carve#710).
 *
 *   oracleHtml(engineFmt(x)) == oracleHtml(x)
 *
 * The engine writes, the executable spec reads. Neither half can hide a defect
 * in the other, which is the property the three sweeps above cannot have.
 */
const oracleHtml = (source) => {
  try {
    return renderDoc(oracleParse(source)).trim()
  } catch (error) {
    if (error instanceof Refuse) return `REFUSED ${error.message}`
    throw error
  }
}

// Documents the executable spec REFUSES (a security bound, PART 9 §25). The
// refusal is the correct answer, and comparing two refusal messages says
// nothing, so they are excluded here and covered by tests/corpus.test.mjs.
const crossReadable = documents.filter(({ slug }) => !REFUSED_ALLOW.has(slug))

test('a cross-read document set is non-empty, so a filter cannot pass as a clean run', () => {
  assert.ok(
    crossReadable.length > documents.length - 50,
    `${crossReadable.length} of ${documents.length} documents are cross-read`,
  )
})

/*
 * Documents where the PINNED writer and this reader still disagree, each with
 * the reason and the change that closes it. Never a silent skip: the second test
 * below fails when a listed document starts agreeing, so the list empties itself
 * on the pin bump instead of turning into a list of excuses. Same shape as
 * resources/engine-pin-drift.txt.
 */
const KNOWN_CROSS_READ_DIVERGENCE = new Map([
  // The writer glues a lone span marker to the opening pipe, where `<` is also
  // the left-alignment sigil: `|<|` is a colspan to every engine and an
  // alignment marker here. Fixed in the three writers (carve-js#686,
  // carve-rs#628, carve-php#828); these clear when the pin moves past it.
  ['10-tables-with-rowspan-and-colspan', 'a lone span marker is written glued to the pipe'],
  ['52-table-alignment-with-colspan', 'a lone span marker is written glued to the pipe'],
  ['98-table-span-marker-in-first-column', 'a lone span marker is written glued to the pipe'],
  ['106-blocked-span-marker-renders-as-empty-cell', 'a lone span marker is written glued to the pipe'],
  ['107-colspan-marker-scans-left-past-a-consumed-cell', 'a lone span marker is written glued to the pipe'],
  // The writer put a footnote body at THREE spaces, one column above its own
  // (PART 9 §16), so the body's blocks sat at a relative column above zero and
  // did not open. Fixed for all three writers (carve#709); the pin predates it.
  ['203-a-footnote-body-holds-blocks-and-they-render-where-they-were-written', 'a footnote body is written at three spaces'],
  ['204-a-heading-in-a-footnote-body-takes-an-id-but-no-section-wrapper', 'a footnote body is written at three spaces'],
  ['205-an-attribute-line-inside-a-footnote-body-attaches-inside-it', 'a footnote body is written at three spaces'],
  ['218-a-footnote-body-s-own-column-is-two-and-a-third-column-is-its-text', 'a footnote body is written at three spaces'],
  ['219-a-definition-below-a-footnote-body-s-column-is-the-document-s-own-text', 'a footnote body is written at three spaces'],
  ['220-a-definition-past-a-footnote-body-s-column-is-the-body-s-own-text', 'a footnote body is written at three spaces'],
])

function crossReadDivergences() {
  const changed = []
  for (const { slug, source } of crossReadable) {
    const before = oracleHtml(source)
    if (before.startsWith('REFUSED')) continue
    if (oracleHtml(carveToCarve(source)) !== before) changed.push(slug)
  }
  return changed
}

test('the executable spec reads what the engine formatted (carve#710)', () => {
  const unexpected = crossReadDivergences().filter((slug) => !KNOWN_CROSS_READ_DIVERGENCE.has(slug))
  assert.deepEqual(
    unexpected,
    [],
    `the engine's formatter wrote a form the executable spec reads differently - ` +
      `each of these is either a writer emitting a form only its own parser accepts, ` +
      `or an oracle defect, and both are findings:\n  ${unexpected.join('\n  ')}`,
  )
})

test('every known cross-read divergence is still diverging', () => {
  const diverging = new Set(crossReadDivergences())
  const fixed = [...KNOWN_CROSS_READ_DIVERGENCE.keys()].filter((slug) => !diverging.has(slug))
  assert.deepEqual(
    fixed,
    [],
    `these documents now survive the cross-read - delete them from ` +
      `KNOWN_CROSS_READ_DIVERGENCE so the gate keeps watching them:\n  ${fixed.join('\n  ')}`,
  )
})

test('every known cross-read divergence names a document that exists', () => {
  const slugs = new Set(documents.map(({ slug }) => slug))
  const dead = [...KNOWN_CROSS_READ_DIVERGENCE.keys()].filter((slug) => !slugs.has(slug))
  assert.deepEqual(
    dead,
    [],
    `KNOWN_CROSS_READ_DIVERGENCE names documents the corpus no longer has, so those ` +
      `entries exempt nothing and hide nothing - renumbered or deleted:\n  ${dead.join('\n  ')}`,
  )
})
