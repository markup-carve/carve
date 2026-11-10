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

test('study switch treats a right-side code closer as structural', () => {
  const source = '````\nx\n  ````\ny\n'
  assert.equal(html(source), '<pre><code>x\n  ````\ny\n</code></pre>')
  assert.equal(html(source, 'minimal'), '<pre><code>x\n</code></pre>\n<p>y</p>')
})

test('study switch does not suppress a sibling colon opener', () => {
  const source = '- ::: note\n  - para text\n:::\n'
  assert.equal(html(source, 'minimal'), html(source))
})

test('marker-shaped code payload remains literal', () => {
  const source = '```\n- ```\ntail\n```\n'
  assert.equal(html(source, 'minimal'), html(source))
})

test('a traced task-item opener keeps its source column', () => {
  const source = '- [x] ```\n  x\n  ```\ny\n'
  assert.match(html(source, 'minimal'), /<pre><code>x\n```\n<\/code><\/pre>/)
})

test('the study switch normalizes CRLF before using trace line numbers', () => {
  const source = '  ```\r\nx\r\n ```\r\ny\r\n'
  assert.equal(html(source, 'minimal'), '<pre><code>x\n```\ny\n</code></pre>')
})

test('a right-side line-block closer is structural in the study mode', () => {
  const source = '::: |\nx\n  :::\ny\n'
  assert.match(html(source, 'minimal'), /<\/div>\n<p>y<\/p>/)
})

test('a right-side task-item closer lands at its parser content column', () => {
  const source = '- [x] ```\n  x\n       ```\n  y\n'
  assert.match(html(source, 'minimal'), /<pre><code>x\n<\/code><\/pre>/)
  assert.doesNotMatch(html(source, 'minimal'), /<code>x\n {5}```/)
})

test('a line-block opener may have more than one separator space', () => {
  const source = ':::  |\nx\n  :::\ny\n'
  assert.match(html(source, 'minimal'), /<\/div>\n<p>y<\/p>/)
})
