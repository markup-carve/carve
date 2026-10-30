import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('the rest of a cut arrow forms a comparison with the next =', () => {
  assert.equal(html('=a<=>=b=\n'), '<p><mark>a&lt;</mark>≥b=</p>')
  assert.equal(html('=a ==>=b=\n'), '<p><mark>a =</mark>≥b=</p>')
})

test('only an = at the end of the arrow joins the rest', () => {
  assert.equal(html('=a<=> =b=\n'), '<p><mark>a&lt;</mark>&gt; <mark>b</mark></p>')
  assert.equal(html('=a<=>*b*\n'), '<p><mark>a&lt;</mark>&gt;<strong>b</strong></p>')
})
