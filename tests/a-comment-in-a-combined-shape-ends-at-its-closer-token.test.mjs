import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// carve#4051: §21a ends a `%%` in a `/*...*/` shape at the closer token, and a
// `*/` before alnum or after whitespace is not one (THE COMBINED TOKEN).
test('a */ before a letter is comment text', () => {
  assert.equal(html('/*a %% b*/c d*/ y\n'), '<p><strong><em>a</em></strong> y</p>')
})

test('a */ after whitespace is comment text', () => {
  assert.equal(html('/*a %% b */ c*/ y\n'), '<p><strong><em>a</em></strong> y</p>')
})

test('the split shape reads as if the comment were absent (carve#4042 ruling)', () => {
  assert.equal(html('/x /*a %% b*/c d*/ y\n'), html('/x /*a*/ y\n'))
  assert.equal(html('/x /*a*/ y\n'), '<p><em>x /<strong>a</strong></em> y</p>')
})

test('the closer token still ends the comment', () => {
  assert.equal(html('/*a %% b*/ y\n'), '<p><strong><em>a</em></strong> y</p>')
  assert.equal(html('/*a %% b*/'), '<p><strong><em>a</em></strong></p>')
})
