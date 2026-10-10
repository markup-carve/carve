// A braced comment leaves the preceding emitted character unchanged (carve#2861).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

// Each pair renders the same text; the second spelling only adds a comment.
const PAIRS = [
  ['\\{"q"\n', '\\{{%%}"q"\n'],
  ['\\{"q"\n', '\\{{% hidden %}"q"\n'],
  ['\\{"q"\n', '\\{{%%}{%%}"q"\n'],
  ["\\{'q'\n", "\\{{%%}'q'\n"],
  ['x "q"\n', 'x {% hidden %}"q"\n'],
  ['x "q"\n', 'x {%%}"q"\n'],
  ['"q"\n', '{%%}"q"\n'],
]

for (const [plain, commented] of PAIRS) {
  test(`a comment does not move the quote in ${JSON.stringify(commented)}`, () => {
    assert.equal(html(commented), html(plain))
  })
}

test('the opening glyph is the one both spellings get', () => {
  // Equal outputs can still agree on the wrong glyph.
  assert.equal(html('\\{{%%}"q"\n'), '<p>{\u201cq\u201d</p>')
  assert.equal(html('{%%}"q"\n'), '<p>\u201cq\u201d</p>')
  assert.equal(html('x {% hidden %}"q"\n'), '<p>x \u201cq\u201d</p>')
  assert.equal(html("\\{{%%}'q'\n"), '<p>{\u2018q\u2019</p>')
})

test('a comment after real content leaves the closing glyph alone', () => {
  // The attributed content still contributes its last character.
  assert.equal(html('a{%%}"q"\n'), '<p>a\u201dq\u201d</p>')
  assert.equal(html('[x]{.c}{%%}"q"\n'), '<p><span class="c">x</span>\u201dq\u201d</p>')
  assert.equal(html('[x]{.c}"q"\n'), '<p><span class="c">x</span>\u201dq\u201d</p>')
})
