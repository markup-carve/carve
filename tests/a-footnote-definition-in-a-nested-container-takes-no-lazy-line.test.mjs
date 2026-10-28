/*
 * A footnote definition's extent takes no lazy line (CARVE-P0-012 DEFINITION
 * EXTENT), so after one at a nested content column no paragraph is open
 * anywhere in the stack (CARVE-P0-011) and an unmarked line leaves the
 * containers it does not reach. The quote tracker counted the note's own
 * lines as an open quote paragraph, and the item collector counted a note
 * continuation line as an open sub-item paragraph (carve#3276).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const QL = '<blockquote><ul><li>para</li></ul></blockquote>'
const CASES = [
  ['a quoted item', '> - para\n>   [^f]: n\ntail\n', `${QL}<p>tail</p>`],
  ['a quoted ordered item', '> 1. para\n>    [^f]: n\ntail\n', '<blockquote><ol><li>para</li></ol></blockquote><p>tail</p>'],
  ['a quoted item, unclosed fence', '> - para\n>   [^f]: n\n```\ncode\n', `${QL}<pre><code>code </code></pre>`],
  ['a quoted item, note continuation', '> - para\n>   [^f]: n\n>     more\ntail\n', `${QL}<p>tail</p>`],
  ['a quoted item, list marker', '> - para\n>   [^f]: n\n- tail\n', `${QL}<ul><li>tail</li></ul>`],
  ['a quoted definition body', '> :: t\n> : d\n>   [^f]: n\ntail\n', '<blockquote><dl><dt>t</dt><dd>d</dd></dl></blockquote><p>tail</p>'],
  ['a quoted sub-item', '> - a\n>   - para\n>     [^f]: n\ntail\n', '<blockquote><ul><li>a <ul><li>para</li></ul></li></ul></blockquote><p>tail</p>'],
  ['a quote in an item, column 2', '- > - para\n  >   [^f]: n\n  tail\n', `<ul><li>${QL} tail </li></ul>`],
  ['a sub-item, note continuation', '- a\n  - para\n    [^f]: n\n      more\nx\n', '<ul><li>a <ul><li>para</li></ul></li></ul><p>x</p>'],
]

for (const [what, src, expected] of CASES) {
  test(`a footnote definition in ${what} leaves no lazy line`, () => {
    assert.equal(oracle(src), expected)
  })
}

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
