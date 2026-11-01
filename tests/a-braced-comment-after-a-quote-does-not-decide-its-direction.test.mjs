// A braced comment after a quote counts as nothing for its direction (carve#4719).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

const PAIRS = [
  ['"a-"\n', '"a-"{%%}\n'],
  ['"a-" b\n', '"a-"{% c %} b\n'],
  ['"a-".\n', '"a-"{%%}{%%}.\n'],
  ['*"a-"*\n', '*"a-"{%%}*\n'],
  ["'90s\n", "'{%%}90s\n"],
  ["'tis'y\n", "'tis'{%%}y\n"],
]

for (const [plain, commented] of PAIRS) {
  test(`a comment after the quote changes nothing in ${JSON.stringify(commented)}`, () => {
    assert.equal(html(commented), html(plain))
  })
}

test('the closing glyph is the one both spellings get', () => {
  assert.equal(html('"a-"{%%}\n'), '<p>“a-”</p>')
  assert.equal(html('"a-"{%x%}y\n'), '<p>“a-“y</p>')
})
