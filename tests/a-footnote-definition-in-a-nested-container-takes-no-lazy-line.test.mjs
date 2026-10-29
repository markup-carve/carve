/*
 * A footnote body takes a lazy line like every container (carve#3885, PART 0
 * S4): after a note at a nested content column, an unmarked line folds into
 * the note's open paragraph and leaves the containers it does not reach.
 * These rows encoded the retired "a footnote takes no lazy line" reading
 * (carve#3276) until carve#3892 item 4.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const QL = '<blockquote><ul><li>para</li></ul></blockquote>'
const CASES = [
  ['a quoted item', '> - para\n>   [^f]: n\ntail\n', QL, 'n tail'],
  ['a quoted ordered item', '> 1. para\n>    [^f]: n\ntail\n', '<blockquote><ol><li>para</li></ol></blockquote>', 'n tail'],
  ['a quoted item, note continuation', '> - para\n>   [^f]: n\n>     more\ntail\n', QL, 'n more tail'],
  ['a quoted item, list marker', '> - para\n>   [^f]: n\n- tail\n', QL, 'n - tail'],
  ['a quoted definition body', '> :: t\n> : d\n>   [^f]: n\ntail\n', '<blockquote><dl><dt>t</dt><dd>d</dd></dl></blockquote>', 'n tail'],
  ['a quoted sub-item', '> - a\n>   - para\n>     [^f]: n\ntail\n', '<blockquote><ul><li>a <ul><li>para</li></ul></li></ul></blockquote>', 'n tail'],
  ['a quote in an item, column 2', '- > - para\n  >   [^f]: n\n  tail\n', `<ul><li>${QL}</li></ul>`, 'n tail'],
  ['a sub-item, note continuation', '- a\n  - para\n    [^f]: n\n      more\nx\n', '<ul><li>a <ul><li>para</li></ul></li></ul>', 'n more x'],
]

for (const [what, src, expected, note] of CASES) {
  test(`a footnote definition in ${what} takes the lazy line`, () => {
    assert.equal(oracle(src), expected)
    assert.equal(parse(src).footnoteDefs.get('f').at(-1).lines.map((l) => l.replace(/^\u0000L\u0000/, '')).join(' '), note)
  })
}

// carve#4018: a closerless opener interrupts, so it is never lazy and opens below the quote.
test('a closerless fence after a note in a quoted item leaves the containers', () => {
  const src = '> - para\n>   [^f]: n\n```\ncode\n'
  assert.equal(oracle(src), `${QL}<pre><code>code </code></pre>`)
  assert.deepEqual(parse(src).footnoteDefs.get('f').at(-1).lines, ['n'])
})

// Controls: a line at the sub-item's column ends the note and reopens a
// paragraph, and an abbreviation inside a container is ordinary text.
test('a line at the sub-item column after a note opens the item paragraph', () => {
  assert.equal(oracle('- a\n  - para\n    [^f]: n\n    more\nx\n'),
    '<ul><li>a <ul><li>para</li></ul></li></ul>')
})
test('an abbreviation line in a quoted item keeps the paragraph open', () => {
  assert.equal(oracle('> - para\n>   *[A]: b\ntail\n'),
    '<blockquote><ul><li>para *[A]: b tail</li></ul></blockquote>')
})
