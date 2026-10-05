/*
 * The item collector decides "does this item claim the next line" from three
 * separate facts: whether a paragraph is open, whether the line is a block
 * opener, and which container owns the line's column. They used to be answered
 * by one predicate, and carve#2744 measured two candidate rules for a
 * flush-left line below a nested item failing on that conflation in opposite
 * directions rather than on their own merits.
 *
 * These three documents are what bound the design. Each one is answered by a
 * different pair of the three questions, so a change that re-folds any two of
 * them back together fails here by name rather than only as a moved corpus row.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDoc } from '../scripts/spec/html.mjs'
import { parse } from '../scripts/spec/layout.mjs'

const T = '~'.repeat(3)
const render = (source) => renderDoc(parse(source))

test('an absorbed paragraph still claims a flush-left line in a quote host', () => {
  // Q1 says a paragraph is open: `c`, the lazy `b` and both tilde runs are one
  // absorbed paragraph, which is why they render as text rather than a fence.
  // Generalizing Q2 across the nested columns erased that signal and moved
  // `flush` out to the quote, destroying §10 lazy continuation.
  for (const depth of [1, 2, 3]) {
    const quoted = '> '.repeat(depth)
    const source = `- a\n  - c\n  b\n    ${T}\n  ${T}`
      .split('\n').map((line) => quoted + line).join('\n') + '\nflush\n'
    assert.match(render(source), /flush<\/li>/, source)
    assert.notEqual(parse(source).blocks.at(-1).t, 'para', source)
  }
})

test('an indented opener below an item is a block, not the item s lazy text', () => {
  // Q2 recognizes the opener at the column Q3 gives it. Dropping the Q1 gate
  // made the item take the whole run as text and the `:::` opener vanish.
  assert.equal(
    render('- d\n  ::: d\ntail\n'),
    '<ul>\n  <li>d\n    <div class="d">\n\n    </div>\n  </li>\n</ul>\n<p>tail</p>',
  )
})

test('a floating attribute leaves the content column where Q3 reads it', () => {
  // Q3 alone: the attribute block does not widen the item, so the next line
  // sits at the content column of an item that holds no open paragraph.
  assert.equal(render('-{#k} {#h}\n # h\n'), '<ul>\n  <li id="k"></li>\n</ul>\n<p># h</p>')
})
