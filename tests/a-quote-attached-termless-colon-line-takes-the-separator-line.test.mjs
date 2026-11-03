import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a termless `: ` line a quote attaches opens no fence, so the next quote line starts a paragraph', () => {
  assert.equal(html('> +\n: ``` js\n> q\n'), '<blockquote><p>: <code> js</code></p><p>q</p></blockquote>')
  assert.equal(html('> > +\n> : ``` js\n> > q\n'), '<blockquote><blockquote><p>: <code> js</code></p><p>q</p></blockquote></blockquote>')
  assert.equal(html('> a\n+\n: ```\n> q\n'), '<blockquote><p>a</p><p>: <code></code></p><p>q</p></blockquote>')
  assert.equal(html('- > +\n  - : ```\n  > q\n'), '<ul><li><blockquote><ul><li>: <code></code></li></ul><p>q</p></blockquote></li></ul>')
})

test('a `: ` line under a term above the `+` is a description whose fence stays open', () => {
  assert.equal(html('> :: t\n+\n: ``` js\n> q\n'), '<blockquote><dl><dt>t</dt><dd><pre><code class="language-js"></code></pre></dd></dl><p>q</p></blockquote>')
  assert.equal(html('> t\n+\n- :: t\n  : ``` js\n> q\n'), '<blockquote><p>t</p><ul><li><dl><dt>t</dt><dd><pre><code class="language-js"></code></pre></dd></dl></li></ul><p>q</p></blockquote>')
})
