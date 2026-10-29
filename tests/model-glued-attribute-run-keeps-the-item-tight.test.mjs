import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a glued attribute run after a blank in an item is not a second paragraph (carve#4081 shape 10)', () => {
  assert.equal(html('- a\n\n  {x}{x}{y}\n'), '<ul>\n  <li>a</li>\n</ul>')
  assert.equal(html('- a\n\n  {.a}{#b}\n'), '<ul>\n  <li>a</li>\n</ul>')
  assert.equal(html('1. a\n\n   {x}{y}\n'), '<ol>\n  <li>a</li>\n</ol>')
})

test('a glued run reads like a single block in the same gap', () => {
  assert.equal(html('- a\n\n  {x}{y}\n'), html('- a\n\n  {x}\n'))
})

test('a spaced run is still a second paragraph and loosens the item', () => {
  assert.match(html('- a\n\n  {x} {y}\n'), /<li><p>a<\/p>\n\s*<p>\{x\} \{y\}<\/p>/)
})

test('a glued run still attaches to a following paragraph, which loosens the item', () => {
  assert.match(html('- a\n\n  {x}{y}\n  b\n'), /<li><p>a<\/p>\n\s*<p x="" y="">b<\/p>/)
})
