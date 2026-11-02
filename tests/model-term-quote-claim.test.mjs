import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const marker of ['-', '*']) {
  test(`a quote past the description column ends the term and closes for a ${marker} line`, () => {
    const source = `${marker} a\n  :: outer\n  :  detail\n     :: inner\n      > quote\n  ${marker} sibling\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>inner<\/dt>\n\s*<\/dl>\n\s*<blockquote><p>quote</)
    assert.ok(html.includes(`<p>quote</p></blockquote>`), html)
    assert.match(html, /<li>sibling<\/li>/)
  })
}

test('a marker below a quote in a description closes both', () => {
  const source = '- a\n  :: outer\n  :  detail\n      > quote\n  - sibling\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<blockquote><p>quote<\/p><\/blockquote>[^]*<li>sibling<\/li>/)
})
