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

/*
 * carve#2746 added per-descendant question-1 state, because Q1 is per-container
 * state rather than one bit and asking Q2 at a descendant's column needs Q1
 * answered for the container that owns it. These two bound that state: each is
 * a gap the ticket MEASURED, and each is unreachable without the lifecycle.
 */

test('a malformed colon opener absorbed on a marker line is reachable', () => {
  // The seed. `para`'s first line here is the raw `- - :::d`, whose `- - ` is
  // MARKERS rather than indentation, so no dedent recovers the opener. The
  // descendant's own state is seeded from the marker line instead, which is the
  // only place `:::d` exists at the descendant's column.
  const sink = {}
  parse('- - :::d\n', { stateSink: sink })
  assert.deepEqual(sink.descendantQ1, [{ col: 4, open: true, para: [':::d'], absorbedFence: null }])
  // and the answer itself does not move: the opener stays text in the item.
  assert.equal(
    renderDoc(parse('- - :::d\n')),
    '<ul>\n  <li>\n    <ul>\n      <li>:::d</li>\n    </ul>\n  </li>\n</ul>',
  )
})

test('an absorbed fence in a descendant is recorded without opening anything', () => {
  // `trackNestedFence` returns null for an absorbed fence, and that null is
  // load-bearing: returning `kind: 'code'` would make `nestedVerbatim()` end
  // the item and tell the nested parse the fence opens. The signal is recorded
  // beside it instead.
  const sink = {}
  const source = '- a\n  - c\n  b\n    ```\n  ```\nflush\n'
  parse(source, { stateSink: sink })
  assert.equal(sink.descendantQ1.at(-1).absorbedFence.run, '```')
  // The paragraph the fence is absorbed INTO is this item's own (`b`, at the
  // item's content column), not the descendant's: `b` already closed the
  // sub-item above it. So the descendant holds no open paragraph, and the
  // absorbed opener does not invent one (markup-carve/carve#2884).
  assert.equal(sink.descendantQ1.at(-1).open, false)
  // The fence is absorbed, so it renders as text and `flush` stays in the item -
  // the item's own paragraph is the deepest frame here, and it is open.
  assert.match(renderDoc(parse(source)), /flush<\/li>/)
})

test('a descendant s marker-line fence closer is not an unterminated opener', () => {
  // The opener is the MARKER line, so asking the shape question of the line in
  // hand reads the closer as an opener of its own - which would leave the fence
  // unterminated. It is terminated, the descendant holds an empty code block,
  // and a closed fence is not an open paragraph: `x` is a document paragraph
  // (markup-carve/carve#2884, corpus
  // 553-a-below-column-line-continues-a-paragraph-only-where-one-is-open-3).
  assert.equal(
    renderDoc(parse('- - ```\n    ```\nx\n')),
    '<ul>\n  <li>\n    <ul>\n      <li>\n        <pre><code></code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<p>x</p>',
  )
})
