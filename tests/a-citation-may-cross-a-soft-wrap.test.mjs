/*
 * The citation patterns, driven over synthetic prose.
 *
 * tests/normativity.test.mjs scans the tree with these and reports the
 * citations that dangle. On a clean tree it says nothing - and it says exactly
 * the same nothing when the patterns match nothing at all, which is how a
 * citation of a RETIRED clause passed CI during the 0.1.3 cut: a line wrap fell
 * between the part number and the clause, and the gate could not see it
 * (carve#1395).
 *
 * So the patterns get their own inputs here, in both directions:
 *
 *   - a citation broken by a soft wrap is FOUND, valid or dangling alike;
 *   - a citation is never assembled ACROSS A PARAGRAPH BREAK, which is what
 *     the cheap fix - strip the newlines - would have done, fusing a reference
 *     at the end of one paragraph with a clause at the start of the next into
 *     a citation nobody wrote.
 *
 * The second direction is the one that is easy to break, and it is why these
 * are separate assertions rather than one.
 *
 * NOTE ON THE FIXTURES. Every line break here is written as an escape, and the
 * section sign is interpolated rather than written next to a part number, so no
 * fixture in this file reads as a citation to the scan itself. That scan covers
 * its own sources, and a fixture naming a retired or invented clause would
 * otherwise be reported as a defect in the tree.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { bareCitation, eachClause, qualifiedCitation } from '../scripts/lib/citations.mjs'

/** The section sign, never spelled next to a part number in this file. */
const S = '§'

/** Every clause a qualified citation names, as `part:clause`, in source order. */
const qualified = (text) => {
  const hits = []
  for (const m of text.matchAll(qualifiedCitation())) {
    eachClause(m[2], m[3], (id) => hits.push(`${m[1]}:${id}`))
  }
  return hits
}

/** Every clause a bare `§N` group names, the form used on the PART 12 pages. */
const bare = (text) => {
  const hits = []
  for (const m of text.matchAll(bareCitation(S))) eachClause(m[1], m[2], (id) => hits.push(id))
  return hits
}

test('a citation on one line is found', () => {
  // The control. This form was already caught, and it stays caught.
  assert.deepEqual(qualified(`see PART 11 ${S}10d for the withdrawn rule.`), ['11:10d'])
  assert.deepEqual(qualified(`see PART 12 section 3a for the wire shape.`), ['12:3a'])
})

test('a citation broken by a soft wrap is found', () => {
  // The defect. Prose here is hard-wrapped, so this is the ordinary spelling
  // rather than an unlucky one - twelve real citations across the docs, the
  // grammar and the changelog were in this shape when the gate was widened.
  assert.deepEqual(qualified(`see PART 11\n  ${S}10d for the withdrawn rule.`), ['11:10d'])
  assert.deepEqual(qualified(`see PART 12\nsection 3a for the wire shape.`), ['12:3a'])
  assert.deepEqual(qualified(`see PART 12 section\n  3a for the wire shape.`), ['12:3a'])
  // A tab is a gap too, and CRLF is a line break.
  assert.deepEqual(qualified(`see PART 9\t${S}24 for the composed strips.`), ['9:24'])
  assert.deepEqual(qualified(`see PART 9\r\n  ${S}24 for the composed strips.`), ['9:24'])
})

test('a VALID citation broken by a soft wrap stays visible', () => {
  // Stated separately from the dangling case on purpose. A fix that found the
  // dangling one by matching more loosely could just as easily stop reporting
  // the part number a valid citation names, and the gate would go quiet in a
  // way no red build would ever announce.
  const hits = qualified(
    `A definition's column is reached by composing the strips (PART 9\n${S}24 C5).`,
  )
  assert.deepEqual(hits, ['9:24'])
})

test('a citation is not assembled across a paragraph break', () => {
  // The phantom. Under a gap that admits any whitespace, the part number at the
  // end of one paragraph fuses with the clause opening the next, and the gate
  // reports a dangling clause against prose that is correct - PART 11 has no
  // §24, so this fixture would go red on a tree with nothing wrong with it.
  assert.deepEqual(qualified(`the rule lives in PART 11\n\n${S}24 of PART 9 is unrelated.`), [])
  // A blank line is still blank when it carries trailing whitespace, and still
  // a break when the file uses CRLF.
  assert.deepEqual(qualified(`the rule lives in PART 11\n   \n${S}24 elsewhere.`), [])
  assert.deepEqual(qualified(`the rule lives in PART 11\r\n\r\n${S}24 elsewhere.`), [])
})

test('a citation group reaches every clause it names, across a soft wrap', () => {
  assert.deepEqual(qualified(`PART 9 ${S}1, ${S}9 and ${S}10 apply.`), ['9:1', '9:9', '9:10'])
  assert.deepEqual(qualified(`PART 9 ${S}1, ${S}9 and\n  ${S}10 apply.`), ['9:1', '9:9', '9:10'])
  assert.deepEqual(qualified(`PART 12 ${S}1-2 apply.`), ['12:1', '12:2'])
})

test('a citation group does not swallow the paragraph below it', () => {
  // `-` is one of the connectors, so a bullet opening the next paragraph is
  // exactly what a group with an unbounded tail reaches for. PART 9 has no
  // §99, so a tail that crossed the break would report a defect against prose
  // that is correct.
  //
  // Only the QUALIFIED form can show this. In the bare form every §N is its own
  // group whether or not a tail reaches it, so the clause list comes out the
  // same either way and would be a check that cannot fail.
  assert.deepEqual(qualified(`applies to PART 9 ${S}1\n\n- ${S}99 is a bullet.`), ['9:1'])
})

test('a bare clause group behaves the same way', () => {
  // The PART 12 pages cite with a bare section sign, and they are hard-wrapped
  // like everything else.
  assert.deepEqual(bare(`${S}3a and ${S}7 are the wire clauses.`), ['3a', '7'])
  assert.deepEqual(bare(`${S}3a and\n  ${S}7 are the wire clauses.`), ['3a', '7'])
})
