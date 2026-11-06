import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a block at the item column ends the paragraph a marker-line + pulled (carve#5349)', () => {
  assert.equal(html('- +\nh\n  # H\n'), '<ul><li>h<h1 id="H">H</h1></li></ul>')
  assert.equal(html('- +\nh\n  # H\nz\n'), '<ul><li>h<h1 id="H">H</h1></li></ul><p>z</p>')
  assert.equal(html('1. +\nh\n   > q\n'), '<ol><li>h<blockquote><p>q</p></blockquote></li></ol>')
  assert.match(html('- a\n  - +\n  h\n    | a |\n'), /<li>h<table>/)
  // As after an own-line + (`- a` / `+` / `h` / `  # H`).
  assert.equal(html('- a\n+\nh\n  # H\n'), '<ul><li>ah<h1 id="H">H</h1></li></ul>')
})

test('text and a refused brace run keep the paragraph open (carve#5349)', () => {
  assert.equal(html('- +\nh\n  k\n'), '<ul><li>h\nk</li></ul>'.replace(/\n\s*/g, ''))
  assert.match(html('- +\n{x\ny}\n  > c\n'), /y}\n?&gt; c<\/li>/)
  assert.match(html('- +\nh\n # H\n'), /^<ul><li>h<\/li><\/ul><section id="H">/)
})
