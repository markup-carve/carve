/*
 * A paragraph inside a TIGHT list item still carries its block attributes.
 *
 * A tight item renders its paragraph without a `<p>`, so the item renderer chose
 * the wrapper from tightness alone and the attributes had nowhere to go. They
 * were dropped:
 *
 *   - a          oracle:  <li>a text</li>
 *     {.c}       engines: <li>a <p class="c">text</p></li>
 *     text
 *
 * With the attribute line FIRST the `<p>` went with it - `<li>text</li>` against
 * the engines' `<li><p class="c">text</p></li>`. All three engines wrap in both
 * shapes; the wrapper is decided by the ATTRIBUTES, not by tightness (carve#696).
 *
 * THIRD FIELD LOST AT THE SAME SITE. carve#626 was `battrs` in a LOOSE item and
 * carve#693 was `caption`; both were fixed by teaching this hand-built paragraph
 * path one more field. This one is the same path again, and the fix for carve#626
 * shipped with a comment asserting the tight shape "cannot occur, because an
 * attribute line arrives after a blank and a blank plus a visible paragraph is
 * what makes the item loose". That reasoning was never checked and the first
 * example above has no blank line in it at all.
 *
 * So these assertions cover the TIGHT/LOOSE axis explicitly, and the tight-bare
 * case is pinned alongside them - the fix must not start wrapping every tight
 * item, which is the obvious over-correction.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

test('a tight item keeps an attribute line written after its first line', () => {
  const out = html('- a\n  {.c}\n  text\n')
  assert.match(out, /<p class="c">text<\/p>/, out)
  // The two lines must not become one run of text.
  assert.ok(!/a text/.test(out), out)
})

test('a tight item keeps an attribute line written first', () => {
  // This shape lost the `<p>` as well as the class.
  const out = html('- {.c}\n  text\n')
  assert.match(out, /<li><p class="c">text<\/p><\/li>/, out)
})

test('a loose item still keeps it', () => {
  // carve#626's shape, re-asserted here: the two paths share one site, so a
  // change aimed at either can take the other with it.
  assert.match(html('- a\n\n  {.c}\n  text\n'), /<p class="c">text<\/p>/)
})

test('a tight item with no attributes still renders bare', () => {
  // The boundary, and the obvious over-correction: tightness still decides the
  // wrapper when there are no attributes to hang.
  const out = html('- a\n  b\n')
  assert.ok(!out.includes('<p>'), out)
  assert.match(out, /<li>a\nb<\/li>/, out)
})

test('a single-line tight item still renders bare', () => {
  assert.match(html('- plain\n'), /<li>plain<\/li>/)
})

test('an id and a class both reach a tight item paragraph', () => {
  // Not just the class - the attribute rendering is shared, so this pins that
  // the whole block is carried rather than one key of it.
  const out = html('- a\n  {#i .c}\n  text\n')
  assert.match(out, /<p id="i" class="c">text<\/p>/, out)
})

test('the same shape in an ordered item', () => {
  assert.match(html('1. a\n   {.c}\n   text\n'), /<p class="c">text<\/p>/)
})

test('the same shape in a nested item', () => {
  const out = html('- outer\n  - a\n    {.c}\n    text\n')
  assert.match(out, /<p class="c">text<\/p>/, out)
})
