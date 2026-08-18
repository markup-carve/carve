/*
 * A CONTINUATION ROW IS A ROW ONLY WHERE A TABLE IS ABOVE IT -- PART 9 §5 T6.
 *
 * The corpus carries the direction that reads a `+ ...|` line as PROSE: with no
 * table above it, §5 T6's "a table cannot BEGIN with a continuation row" makes
 * the line ordinary paragraph text, PART 1 S4 finds that paragraph open, and a
 * flush-left line folds into it (carve#1345).
 *
 * The other direction is what says the rule has a parameter rather than a new
 * constant answer: under a REAL table the same line is that table's last row,
 * nothing is open, and the flush-left line does not fold. A fix that simply
 * deleted the continuation-row branch would pass every corpus document added for
 * carve#1345 and get this half wrong, so it is asserted here.
 *
 * IT IS NOT IN THE CORPUS because carve-js and carve-php currently fold `tail`
 * into the container in both documents below, while carve-rs and this
 * implementation end it (markup-carve/carve#1348). They close it when the
 * container's table ends on a STANDARD row - `- | a |` / `  | b |` / `tail`
 * leaves the item in all four - so the divergence is the continuation row
 * alone. A corpus document would gate the cross-engine job on that open
 * divergence; these assertions gate the rule here in the meantime, and the
 * documents move to the corpus when the engines land it.
 *
 * The quote case below is here for the mirror-image reason: the answer is
 * carve-js's and carve-php's, and carve-rs is the engine that has to move.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

test('a continuation row at an item content column leaves no paragraph open', () => {
  const out = html('- | a |\n  + b |\ntail\n')
  assert.ok(out.includes('<td>a b</td>'), `the row must still join the table: ${out}`)
  assert.ok(/<\/ul>\s*<p>tail<\/p>/.test(out), `tail must leave the item: ${out}`)
})

test('a continuation row at the end of a definition body leaves no paragraph open', () => {
  const out = html(':: t\n:  | a |\n   + b |\ntail\n')
  assert.ok(out.includes('<td>a b</td>'), `the row must still join the table: ${out}`)
  assert.ok(/<\/dl>\s*<p>tail<\/p>/.test(out), `tail must leave the definition: ${out}`)
})

test('the SAME shape with no table above it holds an open paragraph', () => {
  // The pair that makes the two assertions above a parameter rather than a
  // position: one line changes, and the answer changes with it.
  const out = html('- a\n  + b |\ntail\n')
  assert.ok(!out.includes('<table>'), `no table may open here: ${out}`)
  assert.ok(/\+ b \|\s*tail/.test(out), `tail must fold into the paragraph: ${out}`)
})

test('a quote answers the same wrapped as it does bare', () => {
  // The PRINCIPLE this was landed for is untouched: one document's answer must
  // not depend on what is wrapped around it. The VALUE it was anchored to has
  // moved (carve#1348).
  //
  // It was anchored to the bare spelling on the ground that "every
  // implementation already answers" it that way, which is the reasoning PART 0
  // disclaims - and the same quote ending on a STANDARD row contradicted it in
  // those same implementations, which is the check that was not run. A quote
  // ending on a continuation row ends on a TABLE, so it holds no open paragraph
  // and `tail` leaves it, bare and wrapped alike.
  const bare = html('> | a |\n> + b |\ntail\n')
  assert.ok(/<\/blockquote>\s*<p>tail<\/p>/.test(bare), `bare: ${bare}`)
  const wrapped = html(':: t\n:  > | a |\n   > + b |\ntail\n')
  assert.ok(/<\/dl>\s*<p>tail<\/p>/.test(wrapped), `wrapped: ${wrapped}`)
})

test('the quote answers the two row spellings the same way', () => {
  // The contradiction that decided carve#1348, and the reason the assertion
  // above moved rather than being defended: the standard-row spelling of the
  // same quote already sent `tail` out in every implementation.
  const standard = html('> | a |\n> | b |\ntail\n')
  assert.ok(/<\/blockquote>\s*<p>tail<\/p>/.test(standard), `standard: ${standard}`)
})

test('a table row is a row by its shape alone, and needs no such context', () => {
  // The asymmetry §5 T6 rests on: a `|`-delimited row OPENS a table, so it
  // answers S4 with nothing above it. Over-reading carve#1345 as "a table-shaped
  // line needs context" would turn this document into a paragraph.
  const out = html('- | a | b |\ntail\n')
  assert.ok(out.includes('<td>a</td><td>b</td>'), `the row must open a table: ${out}`)
  assert.ok(/<\/ul>\s*<p>tail<\/p>/.test(out), `tail must leave the item: ${out}`)
})

/*
 * A ROW THE TABLE READER REJECTS is a separate defect and is NOT decided here:
 * the predicate matches on shape plus "a table is open above", while the reader
 * also breaks on an all-header previous row and on a `splitRow` failure, so
 * `- |=a |` / `  + b |` / `tail` publishes the line as prose and still sends
 * `tail` out. It predates this rule, reaches the item and the definition body
 * as well as the quote, and is filed as markup-carve/carve#1354.
 *
 * The quote peel's own edges. Neither is visible to the corpus: both shapes
 * stayed green across all 1187 documents while the peel got them wrong.
 */

test('an empty quote at the end of a definition body holds nothing open', () => {
  // S4 states this emptiness directly for a list item - `- >` / `X` closes it
  // because "there is no open paragraph anywhere in the stack" - and a `dd` is
  // the same question one construct over. The peel must not borrow the EMPTY
  // BODY answer, which is `true` for the opposite reason: an empty definition
  // body has nothing to protect, an empty quote has nothing to fold into.
  const out = html(':: t\n:  >\ntail\n')
  assert.ok(/<\/dl>\s*<p>tail<\/p>/.test(out), `tail must leave the definition: ${out}`)
})

test('the peel degrades at the nesting cap instead of overflowing', () => {
  // MAX_NESTING_DEPTH promises a DEGRADATION on deeply nested input. A peel
  // that turns once per marker with no budget throws a RangeError out of the
  // layout automaton instead, which is the outcome the cap exists to prevent.
  assert.doesNotThrow(() => html(':: t\n:  ' + '> '.repeat(12000) + 'x\ntail\n'))
})

test('an explicit blank quoted line closes the quote paragraph through the peel', () => {
  // The trailing-blank skip is written for a definition body, where trailing
  // blanks separate the body from what follows. Inside a quote a `>` line IS
  // the quote's own blank and closes the paragraph above it, so the peel must
  // not skip past it. The corpus does not see this: the shape stayed green
  // across every document while the peel got it wrong.
  const out = html(':: t\n:  > a\n   >\ntail\n')
  assert.ok(/<\/dl>\s*<p>tail<\/p>/.test(out), `tail must leave the definition: ${out}`)
})
