import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a blank inside a descendant attached admonition leaves sibling items tight (carve#5356)', () => {
  assert.equal(html('1. a\n  1. +\n  :::: note\n\n     p\n'), '<ol>\n  <li>a</li>\n  <li>\n    <aside class="admonition note" aria-label="Note">\n      <p>p</p>\n    </aside>\n  </li>\n</ol>')
  assert.match(html('1. a\n  1. +\n  :::: note\n\n1. b\n'), /<li><p>a<\/p><\/li>/)
})
