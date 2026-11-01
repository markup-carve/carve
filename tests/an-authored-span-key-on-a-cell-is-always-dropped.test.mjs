// Only the `^` and `<` markers shape the grid, so an authored `rowspan` or
// `colspan` on a cell is dropped whether or not a span is computed (carve#4715).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

const PAIRS = [
  ['|{rowspan=2} a | b |\n| c | d |\n', '| a | b |\n| c | d |\n'],
  ['|{colspan=2} a |\n| c | d |\n', '| a |\n| c | d |\n'],
  ['|={RowSpan=3 .k} h |\n', '|={.k} h |\n'],
  ['|{rowspan=5} a | b |\n| ^ | d |\n', '| a | b |\n| ^ | d |\n'],
  ['| a |{.x colspan="1"} < |\n', '| a |{.x} < |\n'],
]

for (const [authored, plain] of PAIRS) {
  test(`the authored span key changes nothing in ${JSON.stringify(authored)}`, () => {
    assert.equal(html(authored), html(plain))
  })
}

test('an authored align stays beside the computed alignment', () => {
  assert.match(html('|>{align=left} a |\n'), /<td align="left" style="text-align: right;">a<\/td>/)
})
