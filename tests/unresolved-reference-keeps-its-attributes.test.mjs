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

test('a tab separates two attributes, as a space does', () => {
  // This used to assert the opposite - that a tab disqualifies the block - and
  // it was wrong twice over. `attributes` pads with `opt_ws = {whitespace}` and
  // separates with `whitespace+` (grammar.ebnf), and `whitespace` is a space OR
  // a tab, deliberately unlike a marker separator, which is a literal space.
  // All three engines follow the EBNF. Only this oracle rejected it, because
  // resources/carve-core.ohm spelled the separator `" " | "\n"` - so the two
  // normative files answered one production two ways and a test pinned the
  // losing side (carve#878).
  //
  // The unresolved half still shows a literal block, but for the other reason:
  // the reference does not resolve, so the whole run is literal source.
  assert.equal(html('[text][missing]{.a\t.b}\n'), '<p>[text][missing]{.a\t.b}</p>')
  assert.equal(
    html('[t][ok]{.a\t.b}\n\n[ok]: /u\n'),
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
