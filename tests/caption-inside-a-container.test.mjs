/*
 * A `^ ` caption attaches to the block above it wherever that block sits.
 *
 * The oracle promoted a captioned image paragraph at the top level and inside a
 * `:::` div, and DELETED the caption inside a list item - not promoted, not
 * rendered as text, absent (carve#693). The parse was never wrong: the paragraph
 * node carried `caption`. The item renderer built its `<p>` by hand and never
 * consulted it.
 *
 * That is the SECOND field this site has dropped for the same reason. carve#626
 * was `battrs` going the same way, and the fix there was the same: delegate to
 * renderBlock instead of duplicating the top-level paragraph logic. A hand-built
 * path that reads some of a node's fields will keep losing the ones added later,
 * so these assertions are written per CONTAINER rather than per field.
 *
 * carve-js and carve-php both promote in all three positions; carve-rs renders the
 * line as literal text, which is carve-rs#610.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

const IMAGE_WITH_CAPTION = '![alt](/i.png)\n^ Figure 1: caption\n'

test('a captioned image paragraph promotes at the top level', () => {
  const out = html(IMAGE_WITH_CAPTION)
  assert.match(out, /<figure>/)
  assert.match(out, /<figcaption>Figure 1: caption<\/figcaption>/)
})

test('and inside a div', () => {
  const out = html(`:::\n${IMAGE_WITH_CAPTION}:::\n`)
  assert.match(out, /<figcaption>Figure 1: caption<\/figcaption>/)
})

test('and inside a list item', () => {
  // The shape that lost it. Indented to the item's content column.
  const out = html('- ![alt](/i.png)\n  ^ Figure 1: caption\n')
  assert.match(out, /<figcaption>Figure 1: caption<\/figcaption>/, out)
  // The caption text must not ALSO appear as literal item text.
  assert.ok(!out.includes('^ Figure 1: caption'), out)
})

test('and inside a block quote', () => {
  // Not in the report; checked because "which containers" was the whole bug.
  const out = html('> ![alt](/i.png)\n> ^ Figure 1: caption\n')
  assert.match(out, /<figcaption>Figure 1: caption<\/figcaption>/, out)
})

test('a paragraph attribute inside an item still survives too', () => {
  // carve#626's field, re-asserted here because both losses came from the same
  // hand-built path: if someone reverts the delegation, this goes with it.
  const out = html('- a\n\n  {.c}\n  text\n')
  assert.match(out, /class="c"/, out)
})

test('an uncaptioned paragraph in an item is unchanged', () => {
  // The boundary: the plain shape must keep taking the inline path, so a TIGHT
  // item still renders its paragraph without a `<p>`.
  const out = html('- plain\n')
  assert.match(out, /<li>plain<\/li>/, out)
})

test('an orphan caption line with nothing captionable above it stays text', () => {
  // §4: a `^ ` line anywhere else is ordinary content. Delegating must not start
  // promoting these.
  const out = html('- text\n  ^ not a caption\n')
  assert.ok(!out.includes('<figcaption>'), out)
  assert.match(out, /\^ not a caption/, out)
})
