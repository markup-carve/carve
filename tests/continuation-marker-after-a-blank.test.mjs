/*
 * A continuation marker still attaches after a blank line.
 *
 * §17 L3/L4: a `+` at the item's marker column attaches the following
 * flush-left block to that item. Whether a blank line precedes the marker
 * changes nothing about that - but the oracle decided a blank line by looking
 * only at the next CONTENT line, and `+` is not a marker (§11 N1) and sits
 * below the content column, so it matched nothing. The item ended, the marker
 * reached the document level, and a lone `+` there is a refusal - so the whole
 * document was rejected rather than answered (carve#867).
 *
 * The refusal was honest, but it meant the corpus could never pin a shape all
 * three engines agree on, which puts the gap out of reach of every gate rather
 * than merely undecided.
 *
 * The looseness half is measured rather than reasoned: carve-js 52da7be,
 * carve-rs 0a613b2 and carve-php ce082d6 all render the blank and no-blank
 * spellings IDENTICALLY, so the blank before a marker does not loosen the item.
 * Treating it as a separator would make `- a` / `+` / `c` differ from `- a` /
 * blank / `+` / `c`, and no engine does that.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a marker after a blank line attaches its block to the item', () => {
  // The control row for the whole marker axis: it shows the marker is
  // recognized in a LOOSE item independently of what precedes it, which is
  // what makes the neighbouring rows mean anything.
  const out = html('- a\n\n  b\n\n+\nc\n\nx\n')
  assert.equal(out, '<ul><li><p>a</p><p>b</p><p>c</p></li></ul><p>x</p>')
})

test('the blank before the marker does not loosen the item', () => {
  assert.equal(html('- a\n\n+\nc\n\nx\n'), html('- a\n+\nc\n\nx\n'))
})

test('a tight item with a marker after a blank stays tight', () => {
  assert.equal(html('- a\n\n+\nc\n\nx\n'), '<ul><li>a c </li></ul><p>x</p>')
})

test('a lone marker at document level is ordinary text', () => {
  // The control, and it used to assert a REFUSAL - the reasoning being that the
  // refusal removed from ONE position had to survive everywhere else, or the
  // fix would have bought the corpus a shape by making the oracle accept
  // documents the engines reject. The premise was wrong: the engines accept
  // this one. carve-js, carve-php and carve-rs all render the `+` as text here,
  // so the refusal was the oracle alone, and it is gone (carve#1821). §17 L3
  // says the same thing in prose - "outside any container a lone `+` is literal
  // text".
  assert.equal(html('+\nc\n\nx\n'), '<p>+ c</p><p>x</p>')
})
