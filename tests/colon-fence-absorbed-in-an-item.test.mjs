/*
 * An ABSORBED colon fence leaves the item's paragraph open, so a lazy line
 * folds into it.
 *
 * PART 1 S4 folds a lazy line whenever any container in the open stack holds
 * an OPEN PARAGRAPH and the residue is not interrupting. PART 9 §12's opener
 * test rejects `:::note` - a type word wants a separator - so that line is
 * ordinary paragraph text, and §12 then has the paragraph absorb the next
 * fence-shaped line as text too. Neither line opened a block, neither
 * interrupted anything, and the paragraph is still open when the lazy line
 * arrives. Corpus 86-list-lazy-continuation-9 pinned the opposite answer
 * (carve#891).
 *
 * The corpus carries that one document. These are the neighbouring shapes the
 * SAME clause governs, and they are here rather than in the corpus for a
 * deliberate reason: an implementation may agree with the corpus on -9 while
 * still deciding it by the shape of a line, and each row below is where that
 * shortcut comes apart. The investigation behind carve#891 measured all four
 * engines splitting three different ways across exactly these three shapes -
 * so a fix that settles only the corpus document has not implemented the
 * clause, it has moved one proxy.
 *
 * They pin the SPEC's reading, through the executable spec, and make no claim
 * about any engine. That is what keeps them honest: the engines have not
 * shipped this rule yet (carve#891 steps 3 and 4), and where the pinned build
 * is behind the corpus is declared in resources/engine-pin-drift.txt instead.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

// The corpus document, restated here as the control row: without it, a
// neighbouring row that folds proves nothing about why it folded.
test('the absorbed fence leaves the paragraph open and the lazy line folds', () => {
  assert.equal(
    html('- item\n  :::note\n  body\n  :::\ntail\n'),
    '<ul><li>item :::note body ::: tail</li></ul>',
  )
})

// The discriminator. Same five lines, one space added, and the answer inverts:
// `::: note` IS a valid opener, so it interrupts the item's paragraph and its
// closer completes the block, leaving nothing open for `tail` to fold into.
test('a VALID opener closes the paragraph and the lazy line ends the item', () => {
  assert.equal(
    html('- item\n  ::: note\n  body\n  :::\ntail\n'),
    '<ul><li>item <aside class="admonition note"><p>body</p></aside></li></ul><p>tail</p>',
  )
})

test('the lazy line folds from column 1 as it does from column 0', () => {
  assert.equal(
    html('- item\n  :::note\n  body\n  :::\n tail\n'),
    html('- item\n  :::note\n  body\n  :::\ntail\n'),
  )
})

test('the malformed fence may be the paragraph first line, on the marker line', () => {
  assert.equal(
    html('- :::note\n  body\n  :::\ntail\n'),
    '<ul><li>:::note body ::: tail</li></ul>',
  )
})

test('the same shape inside a block quote folds too', () => {
  assert.equal(
    html('> - item\n>   :::note\n>   body\n>   :::\n> tail\n'),
    '<blockquote><ul><li>item :::note body ::: tail</li></ul></blockquote>',
  )
})

// The absorption is a property of the PARAGRAPH, not of the item: once it is
// closed by a blank line, the next `:::note` starts a fresh paragraph, and a
// fence that reaches a paragraph with no malformed opener in it behaves
// normally. Without this row the branch could latch on and never release,
// and every row above would still pass.
test('a blank line ends the absorption', () => {
  assert.equal(
    html('- item\n\n  :::note\n\n  ::: note\n  body\n  :::\ntail\n'),
    '<ul><li><p>item</p><p>:::note</p><aside class="admonition note"><p>body</p></aside></li></ul><p>tail</p>',
  )
})
