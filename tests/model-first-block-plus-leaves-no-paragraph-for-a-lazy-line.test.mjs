import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const FENCE = '```'

// carve#3991: the `+` block is measured at the column it is read at.
for (const opener of ['- +', '1. +', '- [ ] +']) {
  const pad = ' '.repeat(opener.length - 1)
  test(`a line after a heading attached by ${opener} closes the item`, () => {
    assert.match(html(`${opener}\n${pad}# H\ntail\n`), /<\/h1>\n\s*<\/li>\n<\/[uo]l>\n<p>tail<\/p>$/)
  })
  test(`a line after a fence attached by ${opener} closes the item`, () => {
    assert.match(html(`${opener}\n${pad}${FENCE}\n${pad}c\n${pad}${FENCE}\ntail\n`), /<\/pre>\n\s*<\/li>\n<\/[uo]l>\n<p>tail<\/p>$/)
  })
}

test('an item-hosted first-block plus leaves the line to the host', () => {
  assert.match(html('- o\n  - +\n    # H\ntail\n'), /<\/ul>\n {2}<\/li>\n<\/ul>\n<p>tail<\/p>$/)
})

test('a paragraph attached by a first-block plus still takes a lazy line', () => {
  assert.equal(html('- +\n  para\ntail\n'), '<ul>\n  <li>para\ntail</li>\n</ul>')
  assert.match(html('- +\n  > q\nt\n'), /<blockquote><p>q\nt<\/p><\/blockquote>/)
  assert.match(html('- +\n  > q\n> t\n'), /<\/ul>\n<blockquote><p>t<\/p><\/blockquote>$/)
})
