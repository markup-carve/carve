import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('raw inline image bytes keep their paragraph wrapper', () => {
  assert.equal(renderDoc(parse('`<img a>`{=html}')), '<p><img a></p>')
  assert.equal(renderDoc(parse('![a](u)')), '<img src="u" alt="a">')
  assert.equal(renderDoc(parse('{%%}![a](u)')), '<img src="u" alt="a">')
})
