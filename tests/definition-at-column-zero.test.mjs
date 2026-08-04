/*
 * A definition at COLUMN 0 under a list item is a definition, not lazy text.
 *
 * PART 9 §24 C3's BELOW branch folds "every other line" as item text. A line at
 * column 0 is not below a column - it is AT the enclosing context's own block
 * position, which is exactly where a definition is recognized. This
 * implementation folded it anyway, so it was the only one of the four that read
 *
 *     - x
 *     [^f]: y
 *
 *     see[^f]
 *
 * as item text with `see[^f]` left literal. carve-js, carve-rs and carve-php all
 * collect the note (carve#635).
 *
 * No corpus case covered any of this, which is why the whole suite passed while
 * the behaviour was wrong - the same "a guard whose inputs are a fixed list only
 * guards that list" gap carve#645 ran into. These assertions are written against
 * the rule rather than against a corpus entry so they hold whatever the corpus
 * grows to.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const collected = (out) => out.includes('doc-endnotes') || out.includes('<a href="/u">')

test('a footnote definition at column 0 ends the item and registers', () => {
  const out = html('- x\n[^f]: y\n\nsee[^f]\n')
  assert.ok(collected(out), `expected the note to be collected, got: ${out}`)
  assert.ok(!out.includes('[^f]: y'), 'the definition line must not render as text')
})

test('a link reference definition at column 0 ends the item and resolves', () => {
  const out = html('- x\n[r]: /u\n\n[t][r]\n')
  assert.ok(out.includes('<a href="/u">t</a>'), `expected the link to resolve, got: ${out}`)
  assert.ok(!out.includes('[r]: /u'), 'the definition line must not render as text')
})

test('the OUTER item content column reaches column 0 for the inner collector', () => {
  // `- - a` opens two items; the definition sits at the outer item's content
  // column, which dedents to column 0 before the inner list's collector sees
  // it. Same rule, one nesting level in.
  const out = html('- - a\n  [^f]: x\n\nsee[^f]\n')
  assert.ok(collected(out), `expected the note to be collected, got: ${out}`)
  assert.ok(!out.includes('[^f]: x'), 'the definition line must not render as text')
})

test('BELOW every open content column still folds as text', () => {
  // The boundary the fix must not move, and the one shape all four already
  // agreed on (corpus 183): one column in, below both content columns.
  const out = html('- - a\n [^f]: x\n\nsee[^f]\n')
  assert.ok(out.includes('[^f]: x'), `expected the line to stay as text, got: ${out}`)
  assert.ok(!collected(out), 'nothing may be registered from a folded line')
})

test('an abbreviation definition at column 0 still folds as text', () => {
  // Excluded deliberately, and unanimously: PART 12 §7 recognizes an
  // abbreviation definition only as a direct child of the DOCUMENT, and an
  // item's body is not the document however its columns line up. All four
  // implementations agree here.
  const out = html('- x\n*[A]: b\n\nA here\n')
  assert.ok(out.includes('*[A]: b'), `expected the line to stay as text, got: ${out}`)
  assert.ok(!out.includes('<abbr'), 'no abbreviation may be defined from a container')
})
