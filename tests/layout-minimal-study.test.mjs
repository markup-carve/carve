import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source, layoutMode) => renderDoc(parse(source, { layoutMode }))

test('study switch exposes the left-side code closer cost', () => {
  const source = '  ```\nx\n ```\ny\n'
  assert.equal(html(source), '<pre><code>x\n</code></pre>\n<p>y</p>')
  assert.equal(html(source, 'minimal'), '<pre><code>x\n```\ny\n</code></pre>')
})

test('study switch exposes the left-side colon closer cost', () => {
  const source = '  ::: note\nx\n :::\ny\n'
  assert.equal(html(source), '<aside class="admonition note" aria-label="Note">\n  <p>x</p>\n</aside>\n<p>y</p>')
  assert.equal(html(source, 'minimal'), '<aside class="admonition note" aria-label="Note">\n  <p>x\n:::\ny</p>\n</aside>')
})
