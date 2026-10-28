import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const depth of [1, 2, 3]) {
  test(`a quote line below the item column ends a quoted term in an item at depth ${depth}`, () => {
    const source = `${'- '.repeat(depth)}k\n${'  '.repeat(depth)}> :: m\n >\n\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>m<\/dt>/)
    assert.match(html, /<\/ul>\n<blockquote>\n\n<\/blockquote>$/)
    assert.doesNotMatch(html, /<\/blockquote>\s*&gt;/)
  })
}
