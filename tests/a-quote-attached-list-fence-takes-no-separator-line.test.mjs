import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const quoted = (body) => `<blockquote><p>t</p>${body}</blockquote>`
const item = (body) => `<ul><li>${body}</li></ul>`

test('a fence behind the marker of a quote-attached list takes no separator line', () => {
  assert.equal(html('> t\n+\n- ```\n'), quoted(item('<pre><code></code></pre>')))
  assert.equal(html('> t\n+\n- - ~~~\n'), quoted(item(item('<pre><code></code></pre>'))))
  assert.equal(html('> t\n+\n- ```\n> b\n'), quoted(`${item('<pre><code></code></pre>')}<p>b</p>`))
  assert.equal(html('> t\n+\n:: t\n: ```\n'), quoted('<dl><dt>t</dt><dd><pre><code></code></pre></dd></dl>'))
})

test('a later fence of a quote-attached list takes no separator line', () => {
  assert.equal(html('> t\n+\n- x\n  ```\n> b\n'), quoted(`${item('x<pre><code></code></pre>')}<p>b</p>`))
})

test('a closed fence in a quote-attached list ends before the separator line', () => {
  assert.equal(html('> t\n+\n- ```\n  c\n  ```\n> b\n'), quoted(`${item('<pre><code>c</code></pre>')}<p>b</p>`))
})
