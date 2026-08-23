/*
 * Supplying a container's missing closer is a SPELLING change, so it cannot
 * move the enclosing list's tightness (carve#1602).
 *
 * Corpus `362-...-3` is an unterminated div inside a list item:
 *
 *     - ::: d
 *       b
 *
 *       tail
 *
 * and `362-...-4`, added alongside it, is the same document with the `:::` the
 * first one leaves open. That second spelling is not an invention: it is what
 * every canonical writer emits for the first, so PART 11 §1's
 * `parse(fmt(x)) == parse(x)` is a statement about exactly this pair.
 *
 * Two engines read the pair as two different documents. carve-js and carve-rs
 * give the open spelling a LOOSE list and the closed one a TIGHT list, while the
 * blocks under it are identical either way - one list item holding one div
 * holding two paragraphs. That is a self-contradiction rather than a
 * disagreement between engines: read from the tree both are tight, since the
 * item has a single child and the blank line is nested inside the div; read from
 * the source both are loose, since the blank line is still there after the
 * closer is written. Neither reading yields loose-then-tight. carve-php reads
 * both loose, the executable spec below reads both tight, and both of those are
 * self-consistent and so conform. What is settled here is that the two spellings
 * AGREE; which of tight or loose they agree on is deliberately still open.
 *
 * WHY THIS IS NOT AN HTML FIXTURE. The two corpus documents render byte-identical
 * HTML, and `tests/corpus.test.mjs` compares exactly that - so it passes under
 * either reading, and so does every other gate this repo runs over the corpus.
 * A tight list suppresses the `<p>` around an item's paragraph CHILD; here the
 * item's child is the div and the paragraphs are its grandchildren, which
 * suppression never reaches. The equality below is asserted on the parse, and
 * the HTML equality is asserted alongside it so the reason stays visible: it is
 * the check that cannot fail, kept as the demonstration rather than as the gate.
 *
 * PART 11 §1a says the same thing in general terms - the HTML form of the
 * round-trip invariant is "strictly weaker", and "a writer satisfying only the
 * HTML form still fails this section". This is one document where the gap
 * between the two forms is the whole subject.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpus = (slug) => readFileSync(resolve(here, 'corpus', `${slug}.crv`), 'utf8')

const base = '362-an-unterminated-container-does-not-extend-the-item-past-a-blank-line'
const open = corpus(`${base}-3`)
const closed = corpus(`${base}-4`)

/** Source offsets legitimately move when a line is added, so they are not part of "same document". */
const withoutPositions = (node) => {
  if (Array.isArray(node)) return node.map(withoutPositions)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pos' || key === 'srcByteLength') continue
      out[key] = withoutPositions(value)
    }
    return out
  }
  return node
}

/** The first list anywhere in the tree, which for these two documents is the only one. */
const firstList = (node) => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstList(child)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === 'object') {
    if (node.t === 'list') return node
    for (const value of Object.values(node)) {
      const found = firstList(value)
      if (found) return found
    }
  }
  return null
}

test('the two documents differ by the closer line and nothing else', () => {
  // Guards the pin itself: both files are regenerated from resources/examples/,
  // and a pair that drifted apart would still pass everything below while
  // pinning a rule about some other pair of documents.
  assert.equal(closed, `${open}  :::\n`)
})

test('their rendered HTML is byte-identical, so no HTML fixture can see the rule', () => {
  // Not the gate - the demonstration of why the gate has to be the parse. If
  // this ever stops holding, tightness has started leaving a mark in the output
  // and the reasoning above needs rewriting before the assertion below is read
  // as covering it.
  assert.equal(renderDoc(parse(closed)), renderDoc(parse(open)))
})

test('an explicit closer does not change the list tightness', () => {
  const before = firstList(parse(open).blocks)
  const after = firstList(parse(closed).blocks)
  assert.ok(before && after, 'both documents must parse to a list')
  assert.equal(
    after.tight,
    before.tight,
    `supplying the closer moved the list from tight=${before.tight} to tight=${after.tight}; ` +
      'PART 11 §1 makes that a change of document, not of spelling',
  )
})

test('an explicit closer does not change the document at all', () => {
  // The tightness flag is the field this ruling is about, asserted on its own
  // above so the failure names it. This is the whole claim: one item, one div,
  // two paragraphs, identical on both sides.
  assert.deepEqual(withoutPositions(parse(closed)), withoutPositions(parse(open)))
})
