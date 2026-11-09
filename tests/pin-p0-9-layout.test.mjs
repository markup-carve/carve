import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipTransition, parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source, options) => renderDoc(parse(source), options)

test('CARVE-P0-023 replaces a lone surrogate before reading a heading', () => {
  assert.equal(html('# a\uD800b\n'), '<section id="a�b">\n  <h1>a�b</h1>\n</section>')
})

test('CARVE-P0-003 keeps a frame after a closed block without opening its paragraph', () => {
  assert.deepEqual(ownershipTransition('code_fence'), { containerOpen: true, paragraphOpen: false })
  assert.equal(html('- a\n  ```\n  x\n  ```\n  b\n'), '<ul>\n  <li>a\n    <pre><code>x\n</code></pre>\n    b\n  </li>\n</ul>')
})

test('CARVE-P0-015 keeps the item after a lazy fold', () => {
  assert.equal(html('- one\nlazy\n  still\n'), '<ul>\n  <li>one\nlazy\nstill</li>\n</ul>')
})

test('CARVE-P0-019 does not reuse a quote frame after its unmarked blank', () => {
  assert.equal(html('> a\n\n> b\n'), '<blockquote><p>a</p></blockquote>\n<blockquote><p>b</p></blockquote>')
})

test('CARVE-P0-020 selects the deepest reached item column', () => {
  assert.equal(html('- - x\n   > q\n'), '<ul>\n  <li>\n    <ul>\n      <li>x</li>\n    </ul>\n    <blockquote><p>q</p></blockquote>\n  </li>\n</ul>')
})

test('CARVE-P2-018 measures a nested opener from its own definition-body line', () => {
  assert.equal(html(':: t\n:  - a\n    > q\n'), '<dl>\n  <dt>t</dt>\n  <dd>\n    <ul>\n      <li>a</li>\n    </ul>\n    <blockquote><p>q</p></blockquote>\n  </dd>\n</dl>')
})

test('CARVE-P10-013 serializes a safely escaped raw block as code in its container', () => {
  assert.equal(html('> ```=html\n> <p>raw</p>\n> ```\n', { safe: true }),
    '<blockquote>\n  <pre><code class="language-html">&lt;p&gt;raw&lt;/p&gt;\n</code></pre>\n</blockquote>')
})
