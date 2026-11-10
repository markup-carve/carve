import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('an item marker-line brace run refused by its source column stays literal', () => {
  const doc = parse('- {#a\n }\n')
  assert.deepEqual(doc.blocks[0].items[0].blocks[0].literalSegments, [[0, 2]])
  assert.equal(renderDoc(doc), '<ul>\n  <li>{#a\n}</li>\n</ul>')
})

test('an indented item compares both lines in the same authored frame', () => {
  const doc = parse('  - {#a\n   }\n')
  assert.deepEqual(doc.blocks[0].items[0].blocks[0].literalSegments, [[0, 2]])
  assert.equal(renderDoc(doc), '<ul>\n  <li>{#a\n}</li>\n</ul>')
})

test('a note marker-line brace run refused by its source column stays literal', () => {
  const doc = parse('[^n]: {#a\n }\n\nx[^n]\n')
  assert.deepEqual(doc.footnoteDefs.get('n')[0].literalSegments, [[0, 2]])
  assert.match(renderDoc(doc), /<p>\{#a\n\}<a href="\#fnref1"/)
})

test('a continuation past the authored brace still accepts a block attribute', () => {
  const doc = parse('- {.a\n   .b}\n  x\n')
  assert.equal(renderDoc(doc), '<ul>\n  <li><p class="a b">x</p></li>\n</ul>')
})
