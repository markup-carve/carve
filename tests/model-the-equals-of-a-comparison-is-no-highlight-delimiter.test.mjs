import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a comparison inside a bare highlight stays whole (carve#4131)', () => {
  assert.equal(html('=a <= b=\n'), '<p><mark>a ≤ b</mark></p>')
  assert.equal(html('=a >= b=\n'), '<p><mark>a ≥ b</mark></p>')
  assert.equal(html('> - =a<=b=\n'), '<blockquote>\n  <ul>\n    <li><mark>a≤b</mark></li>\n  </ul>\n</blockquote>')
})

test('a comparison alone closes no highlight (carve#4131)', () => {
  assert.equal(html('=a>=\n'), '<p>=a≥</p>')
  assert.equal(html('=a <= b\n'), '<p>=a ≤ b</p>')
})

test('a braced highlight closer still wins over the comparison (carve#3997)', () => {
  assert.equal(html('{=a>=}\n'), '<p><mark>a&gt;</mark></p>')
})

test('an arrow still gives its = to a bare highlight', () => {
  assert.equal(html('=a <== b=\n'), '<p><mark>a &lt;</mark>= b=</p>')
})
