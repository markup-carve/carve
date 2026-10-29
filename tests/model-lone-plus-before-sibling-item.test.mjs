import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a lone + before a sibling stays text after a marker-line sub-list (carve#4079)', () => {
  assert.equal(html('- - o\n  +\n  - x\n'),
    '<ul>\n  <li>\n    <ul>\n      <li>o\n+</li>\n      <li>x</li>\n    </ul>\n  </li>\n</ul>')
})

test('a lone + before a sibling stays text after a lazy line (carve#4079)', () => {
  assert.equal(html('- a\n  - b\no\n  +\n  - c\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li>b\no\n+</li>\n      <li>c</li>\n    </ul>\n  </li>\n</ul>')
})

test('a + before a paragraph still attaches it after a marker-line sub-list', () => {
  assert.match(html('- - o\n  +\n  para\n'), /<li>o\n\s*para\n\s*<\/li>/)
})
