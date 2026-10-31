import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 9 §16: 199 spans nest and the 200th stays literal, bare and braced alike (carve#4564).
const count = (html, tag) => html.split(`<${tag}>`).length - 1

test('a bare span inside 198 braced spans is the 199th and renders', () => {
  const html = renderDoc(parse(`${'{*'.repeat(198)}/x/${'*}'.repeat(198)}\n`))
  assert.equal(count(html, 'strong'), 198)
  assert.equal(count(html, 'em'), 1)
})

test('a bare span inside 199 braced spans is the 200th and stays literal', () => {
  const html = renderDoc(parse(`${'{*'.repeat(199)}/x/${'*}'.repeat(199)}\n`))
  assert.equal(count(html, 'strong'), 199)
  assert.equal(count(html, 'em'), 0)
  assert.ok(html.includes('/x/'))
})

test('199 braced spans inside a bare span keep the innermost literal', () => {
  const html = renderDoc(parse(`/${'{*'.repeat(199)}x${'*}'.repeat(199)}/\n`))
  assert.equal(count(html, 'em'), 1)
  assert.equal(count(html, 'strong'), 198)
})
