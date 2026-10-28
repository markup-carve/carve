import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a nested note does not lend a lazy claim to its containing marker body', () => {
  const source = '[^c]: 1. para\n   [^p]: n\nx\n\n[^c] [^p]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /^<p>x<\/p>\n/)
  assert.match(html, /<p>n<a href="#fnref2"/)
  assert.doesNotMatch(html, /\u0000/)
})
