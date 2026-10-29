import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// The nested note's own paragraph takes `x` (carve#3885); the list item it
// left does not.
test('a nested note takes the lazy line, not its containing marker body', () => {
  const source = '[^c]: 1. para\n   [^p]: n\nx\n\n[^c] [^p]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li>para<\/li>/)
  assert.match(html, /<p>n\nx<a href="#fnref2"/)
  assert.doesNotMatch(html, /\u0000/)
})
