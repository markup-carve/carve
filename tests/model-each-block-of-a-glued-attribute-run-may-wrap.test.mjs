import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a glued run on one line is one attribute line (carve#4078)', () => {
  assert.equal(html('{.a}{.b}\np\n'), '<p class="a b">p</p>')
})

test('a later block of a run may wrap (carve#4078)', () => {
  assert.equal(html('{.a}{.b\n}\np\n'), '<p class="a b">p</p>')
})

test('a block may follow a wrapped block (carve#4078)', () => {
  assert.equal(html('{.a\n}{.b}\np\n'), '<p class="a b">p</p>')
})

test('a wrapped run with nothing below renders nothing, like a lone block (carve#4078)', () => {
  assert.equal(html('{k=""}{c\n}\n'), '')
  assert.equal(html('{c\n}\n'), '')
})

test('a lone block still wraps, in a quote and an item too', () => {
  assert.equal(html('{.a\n}\np\n'), '<p class="a">p</p>')
  assert.match(html('> {.a\n> }\n> p\n'), /<p class="a">p<\/p>/)
  assert.match(html('- x\n\n  {.a\n  }\n  p\n'), /<p class="a">p<\/p>/)
  assert.match(html('> {.a}{.b\n> }\n> p\n'), /<p class="a b">p<\/p>/)
  assert.match(html('- x\n\n  {.a\n  }{.b}\n  p\n'), /<p class="a b">p<\/p>/)
})
