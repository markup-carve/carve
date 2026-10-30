import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a glued run on one line is one attribute line (carve#4078)', () => {
  assert.equal(html('{.a}{.b}\np\n'), '<p class="a b">p</p>')
})

test('a break inside a later block of a run leaves paragraph text (carve#4078)', () => {
  assert.equal(html('{.a}{.b\n}\np\n'), '<p>{.a}{.b\n}\np</p>')
})

test('a block glued after a wrapped block leaves paragraph text (carve#4078)', () => {
  assert.equal(html('{.a\n}{.b}\np\n'), '<p>{.a\n}{.b}\np</p>')
})

test('a wrapped run with nothing below keeps its source (carve#4078)', () => {
  assert.equal(html('{k=""}{c\n}\n'), '<p>{k=““}{c\n}</p>')
})

test('a lone block still wraps, in a quote and an item too', () => {
  assert.equal(html('{.a\n}\np\n'), '<p class="a">p</p>')
  assert.match(html('> {.a\n> }\n> p\n'), /<p class="a">p<\/p>/)
  assert.match(html('- x\n\n  {.a\n  }\n  p\n'), /<p class="a">p<\/p>/)
  assert.doesNotMatch(html('> {.a}{.b\n> }\n> p\n'), /class=/)
  assert.doesNotMatch(html('- x\n\n  {.a\n  }{.b}\n  p\n'), /class=/)
})
