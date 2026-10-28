import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('nested marker bodies carry one lazy frame into the paragraph reader', () => {
  const source = '[^c]: 1. para\n   [^p]: n\nx\n\n[^c] [^p]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<p>n\nx<a href="#fnref2"/)
  assert.doesNotMatch(html, /\u0000/)
})
