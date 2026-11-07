import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('a heading after an unpaired pulled fence opens in the outer item', () => {
  const source = '- - +\n  ```\n\n  x\n    # x\n'
  assert.equal(html(source), '<ul><li><ul><li><pre><code></code></pre></li></ul><p>x</p><h1 id="x">x</h1></li></ul>')
})

test('a later plus after a quote attaches in the outer item', () => {
  const source = '- - +\n  ```\n\n  > q\n  +\n    x\n'
  assert.equal(html(source), '<ul><li><ul><li><pre><code></code></pre></li></ul><blockquote><p>q</p></blockquote><p>x</p></li></ul>')
})

test('a valid closer after the blank keeps the blank in the fence', () => {
  const source = '- - +\n  ```\n\n  x\n  ```\n'
  assert.match(html(source), /<pre><code>\nx<\/code><\/pre>/)
})

test('a later paired fence in the outer item stays a code block', () => {
  const source = '- - +\n  ```\n\n  x\n    ~~~\n    y\n    ~~~\n'
  assert.match(html(source), /<p>x<\/p><pre><code>y<\/code><\/pre>/)
})

test('a sibling item fence cannot close the earlier pulled fence', () => {
  const source = '- - +\n  ```\n\n  x\n    # h\n- - +\n  ```\n\n  z\n'
  assert.match(html(source), /<p>x<\/p><h1 id="h">h<\/h1>/)
})
