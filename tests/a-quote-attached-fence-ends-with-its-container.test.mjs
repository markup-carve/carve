import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a fence behind a list marker in a description a quote attaches stays open to the next quote line', () => {
  assert.equal(html('> :: t\n+\n: - ``` js\n> q\n'), '<blockquote><dl><dt>t</dt><dd><ul><li><pre><code class="language-js"></code></pre></li></ul></dd></dl><p>q</p></blockquote>')
  assert.equal(html('> :: t\n+\n: 1. ~~~ py\n> q\n'), '<blockquote><dl><dt>t</dt><dd><ol><li><pre><code class="language-py"></code></pre></li></ol></dd></dl><p>q</p></blockquote>')
})

test('a line left of the fence column ends the fence, so the next quote line starts a paragraph', () => {
  assert.equal(html('> +\n- ``` js\n- x\n> q\n'), '<blockquote><ul><li><pre><code class="language-js"></code></pre></li><li>x</li></ul><p>q</p></blockquote>')
  assert.equal(html('> :: t\n+\n: - ```\n  - x\n> q\n'), '<blockquote><dl><dt>t</dt><dd><ul><li><pre><code></code></pre></li><li>x</li></ul></dd></dl><p>q</p></blockquote>')
})

test('a payload line at the fence column keeps the fence open', () => {
  assert.equal(html('> :: t\n+\n: - ``` js\n    x\n> q\n'), '<blockquote><dl><dt>t</dt><dd><ul><li><pre><code class="language-js">x</code></pre></li></ul></dd></dl><p>q</p></blockquote>')
})
