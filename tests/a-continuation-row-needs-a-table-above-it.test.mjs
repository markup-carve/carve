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
 * implementation end it (markup-carve/carve#1349). They close it when the
 * container's table ends on a STANDARD row - `- | a |` / `  | b |` / `tail`
 * leaves the item in all four - so the divergence is the continuation row
 * alone. A corpus document would gate the cross-engine job on that open
 * divergence; these assertions gate the rule here in the meantime, and the
 * documents move to the corpus when the engines land it.
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

test('a table row is a row by its shape alone, and needs no such context', () => {
  // The asymmetry §5 T6 rests on: a `|`-delimited row OPENS a table, so it
  // answers S4 with nothing above it. Over-reading carve#1345 as "a table-shaped
  // line needs context" would turn this document into a paragraph.
  const out = html('- | a | b |\ntail\n')
  assert.ok(out.includes('<td>a</td><td>b</td>'), `the row must open a table: ${out}`)
  assert.ok(/<\/ul>\s*<p>tail<\/p>/.test(out), `tail must leave the item: ${out}`)
})
