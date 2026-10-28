import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const marker of ['-', '*']) {
  test(`a ${marker} sibling escapes a description after quote text folds into a term`, () => {
    const source = `${marker} a\n  :: outer\n  :  detail\n     :: inner\n      > quote\n  ${marker} sibling\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>inner\n &gt; quote<\/dt>/)
    assert.match(html, /<\/dl>\n    <ul>\n      <li>sibling<\/li>/)
  })
}

test('a quote that opens in a description keeps its paragraph claim', () => {
  const source = '- a\n  :: outer\n  :  detail\n      > quote\n  - sibling\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<blockquote><p>quote\n- sibling<\/p><\/blockquote>/)
})
