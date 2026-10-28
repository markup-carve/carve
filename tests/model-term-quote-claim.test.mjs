import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const marker of ['-', '*']) {
  test(`a quote past the description column ends the term and takes a ${marker} line lazily`, () => {
    const source = `${marker} a\n  :: outer\n  :  detail\n     :: inner\n      > quote\n  ${marker} sibling\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>inner<\/dt>\n\s*<\/dl>\n\s*<blockquote><p>quote\n/)
    assert.ok(html.includes(`<p>quote\n${marker} sibling</p></blockquote>`), html)
    assert.doesNotMatch(html, /<li>sibling<\/li>/)
  })
}

test('a quote that opens in a description keeps its paragraph claim', () => {
  const source = '- a\n  :: outer\n  :  detail\n      > quote\n  - sibling\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<blockquote><p>quote\n- sibling<\/p><\/blockquote>/)
})
