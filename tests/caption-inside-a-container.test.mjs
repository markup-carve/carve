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

test('a resolved reference image promotes before paragraph serialization', () => {
  const out = html('![alt][img]\n^ Figure 1: caption\n\n[img]: /i.png\n')
  assert.equal(
    out,
    '<figure>\n  <img src="/i.png" alt="alt">\n  <figcaption>Figure 1: caption</figcaption>\n</figure>',
  )
})

test('a resolved reference image keeps block attrs on the figure', () => {
  const out = html('{.gallery}\n![alt][img]\n^ Figure 1: caption\n\n[img]: /i.png\n')
  assert.match(out, /^<figure class="gallery">/, out)
  assert.match(out, /<img src="\/i\.png" alt="alt">/, out)
  assert.match(out, /<figcaption>Figure 1: caption<\/figcaption>/, out)
})

test('an uncaptioned reference image keeps block attrs on the image', () => {
  const out = html('{.gallery}\n![alt][img]\n\n[img]: /i.png\n')
  assert.equal(out, '<img class="gallery" src="/i.png" alt="alt">')
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

/*
 * WHERE THE CAPTION ENDS -- PART 2, MULTI-LINE CAPTIONS
 * (markup-carve/carve#1561).
 *
 * The clause has been explicit since it was written: "A caption is multi-line
 * inline CONTENT, so its text spills onto following lines exactly like a
 * PARAGRAPH (section 10), NOT like a heading", and "Continuation lines join
 * with a newline, so `^ cap` + `more` yields the caption text `cap\nmore`".
 *
 * The oracle read exactly one line at all FIVE of its caption sites, so the
 * continuation line became a second block. No corpus document holds a caption
 * with a continuation line, and the authored docs sample that does
 * (`docs/cheatsheet.md`) had no reader until
 * markup-carve/carve#1552 gave it one - so four readers held two answers with
 * nothing red.
 *
 * PINNED PER HOST, not once. The five sites each had their own copy of the
 * slot read, which is what let one rule be wrong in five places; a single
 * assertion would leave four of them free to drift back. The pinned engine is
 * asserted beside the oracle on the same source for the same reason the
 * comparison exists at all: agreement is the claim, not the oracle's output
 * in isolation.
 */

const CONTINUED = {
  image: '![alt](/i.png)\n^ cap\nmore\n',
  table: '| a | b |\n^ cap\nmore\n',
  quote: '> q\n^ cap\nmore\n',
  code: '```\nx\n```\n^ cap\nmore\n',
  math: '$$`x`\n^ cap\nmore\n',
}

for (const [host, source] of Object.entries(CONTINUED)) {
  test(`a caption on a ${host} folds its continuation line in`, () => {
    const out = html(source)
    assert.match(out, /cap\nmore</, out)
    assert.ok(!out.includes('<p>more</p>'), out)
  })
}

test('the pinned engine folds it the same way, on every host', async () => {
  const { carveToHtml } = await import('@markup-carve/carve')
  for (const [host, source] of Object.entries(CONTINUED)) {
    assert.match(carveToHtml(source), /cap\nmore</, host)
  }
})

test('a caption folds three continuation lines, joined with newlines', () => {
  assert.match(html('![alt](/i.png)\n^ cap\ntwo\nthree\n'), /<figcaption>cap\ntwo\nthree<\/figcaption>/)
})

test('a blank line ends the caption (item 1)', () => {
  const out = html('![alt](/i.png)\n^ cap\n\nafter\n')
  assert.match(out, /<figcaption>cap<\/figcaption>/, out)
  assert.match(out, /<p>after<\/p>/, out)
})

test('a paragraph interrupter ends the caption (item 2)', () => {
  // Section 10's relation, one member per kind it names.
  for (const [what, line] of Object.entries({
    heading: '# H',
    quote: '> q',
    table: '| a | b |',
    fence: '```\nc\n```',
    div: '::: note\nx\n:::',
    thematic: '---',
    comment: '%% c',
  })) {
    const out = html(`![alt](/i.png)\n^ cap\n${line}\n`)
    assert.match(out, /<figcaption>cap<\/figcaption>/, `${what}: ${out}`)
  }
})

test('a list marker does NOT end the caption (item 3)', () => {
  // The one paragraph end condition the clause overrides: a list needs a blank
  // line to interrupt, so the marker line folds in as literal caption text.
  assert.match(html('![alt](/i.png)\n^ cap\n- x\n'), /<figcaption>cap\n- x<\/figcaption>/)
})

test('a second caret line does NOT continue the caption (item 4)', () => {
  // No repeated marker. The second line ends this caption and, with nothing
  // captionable above it, is ordinary paragraph text.
  const out = html('![alt](/i.png)\n^ cap\n^ two\n')
  assert.match(out, /<figcaption>cap<\/figcaption>/, out)
  assert.match(out, /<p>\^ two<\/p>/, out)
})

test('an unresolved reference image gives every caption line back', () => {
  // The unwrap appends the caption's SOURCE to the paragraph. Reading one line
  // where the caption held three would silently drop two of them.
  const out = html('![alt][r]\n^ cap\nmore\nyet\n')
  assert.ok(!out.includes('<figure>'), out)
  assert.match(out, /\^ cap\nmore\nyet/, out)
})
