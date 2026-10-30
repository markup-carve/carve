// A sentinel inside a reference frame is spelled escaped, once per frame around it
// (carve#4426).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(`${src}\n\n[r]: /r\n`)).trim()

test('a reference link pairs across a literal directive', () => {
  assert.equal(html('[a {{ x @lines:0 }} b][r]'), '<p><a href="/r">a {{ x @lines:0 }} b</a></p>')
  assert.equal(html('[a {{ x @code }} b][r]'), '<p><a href="/r">a {{ x @code }} b</a></p>')
})

test('a literal directive holds at every frame depth', () => {
  assert.equal(html('[a [b {{ x @lines:0 }}][r] c][r]'), '<p><a href="/r">a b {{ x @lines:0 }} c</a></p>')
  assert.equal(html('[[[{{ x @lines:0 }}][r] c][r] d][r]'), '<p><a href="/r">{{ x @lines:0 }} c d</a></p>')
})

test('a quote settles in a nested reference frame', () => {
  assert.equal(html('[a [b "c"][r] d][r]'), '<p><a href="/r">a b “c” d</a></p>')
  assert.equal(html('[[[a "b"][r] c][r] d][r]'), '<p><a href="/r">a “b” c d</a></p>')
})

test('raw inline settles in a nested reference frame', () => {
  assert.equal(html('[a [b `<b "q">`{=html}][r] c][r]'), '<p><a href="/r">a b <b "q"> c</a></p>')
})
