/*
 * An unresolved reference falls back to LITERAL SOURCE, and the attribute block
 * is part of that source.
 *
 * The oracle reconstructed the literal from the parts it had kept - label, text,
 * source - and the attribute block was not among them, so `[text][missing]{.wide}`
 * came out as `[text][missing]`. The braces the author typed were deleted. All
 * three engines emit them (carve#679).
 *
 * VERBATIM, not re-serialized. The engines emit the block exactly as written,
 * including interior runs of whitespace and a tab: `{ .wide  #i }` comes back with
 * both spaces. I first measured a collapsed form and was wrong - my probe was
 * whitespace-normalizing the output before comparing it. So the fix carries the
 * block's SOURCE STRING through the reference sentinel rather than re-printing the
 * parsed attribute list, which cannot reproduce the author's spelling.
 *
 * The resolved path is unchanged: there the parsed list is what merges with the
 * definition's own attributes (PART 9R R1), and the last test pins that this fix
 * did not start emitting braces on a link that resolves.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('an unresolved explicit reference keeps its attribute block', () => {
  assert.equal(html('[text][missing]{.wide}\n'), '<p>[text][missing]{.wide}</p>')
})

test('an unresolved collapsed reference keeps it too', () => {
  assert.equal(html('[text][]{.wide}\n'), '<p>[text][]{.wide}</p>')
})

test('an unresolved reference IMAGE keeps it', () => {
  // A separate reconstruction site, and it dropped the block the same way.
  assert.equal(html('![alt][missing]{.wide}\n'), '<p>![alt][missing]{.wide}</p>')
})

test('the block is emitted verbatim, not re-serialized', () => {
  // Interior double space and outer padding both survive - this is what makes a
  // re-print of the parsed list the wrong implementation.
  assert.equal(html('[text][missing]{ .wide  #i }\n'), '<p>[text][missing]{ .wide  #i }</p>')
})

test('a tab does not separate two attributes, and the reason is the position', () => {
  // This assertion has been written both ways and the history is the point.
  // carve#878 read `attributes` as padding with `opt_ws = {whitespace}`, so a
  // tab separated; carve#901 corrected the reading - a tab is syntax only in a
  // line's leading indentation run, and every slot of an INLINE attribute block
  // sits after the first non-whitespace character of its line. carve#906 moved
  // both normative files and the corpus to match (PART 4, THE INLINE INTERIOR
  // IS SPACE-ONLY, THE BLOCK-ATTRIBUTE LINE IS NOT).
  //
  // So the block is unrecognized on BOTH lines below, and for two different
  // reasons: on the first the reference does not resolve either, and on the
  // second the reference resolves and the tabbed block is still literal source
  // trailing the link. That second line is the one that moved.
  assert.equal(html('[text][missing]{.a\t.b}\n'), '<p>[text][missing]{.a\t.b}</p>')
  assert.equal(
    html('[t][ok]{.a\t.b}\n\n[ok]: /u\n'),
    '<p><a href="/u">t</a>{.a\t.b}</p>',
  )
  // The SPACE form is the control: the block still attaches.
  assert.equal(
    html('[t][ok]{.a .b}\n\n[ok]: /u\n'),
    '<p><a href="/u" class="a b">t</a></p>',
  )
})

test('a quoted value with interior spaces survives', () => {
  assert.equal(html('[text][missing]{key="a  b"}\n'), '<p>[text][missing]{key="a  b"}</p>')
})

test('an unresolved reference with no block is unchanged', () => {
  // The boundary: nothing to carry, and no stray braces appear.
  assert.equal(html('[text][missing]\n'), '<p>[text][missing]</p>')
})

test('a RESOLVED reference still applies its attributes as attributes', () => {
  // The other side: the parsed list still drives the resolved path, and the
  // braces must NOT show up as text there.
  const out = html('[t][ok]{.wide}\n\n[ok]: /u\n')
  assert.equal(out, '<p><a href="/u" class="wide">t</a></p>')
})

test('a resolved reference image still applies them', () => {
  const out = html('![a][ok]{.wide}\n\n[ok]: /p.png\n')
  assert.match(out, /<img src="\/p\.png" alt="a" class="wide">/, out)
})
