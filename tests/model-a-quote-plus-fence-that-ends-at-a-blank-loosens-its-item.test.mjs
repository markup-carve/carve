import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

// A fence a `> +` quote attaches ends at its first blank (§17 L3), so the blank separates two item blocks (§17 L1).
test('an unclosed fence a quote plus attached ends at the blank and loosens the item (carve#5510)', () => {
  const loose = '<ul><li><blockquote><pre><code></code></pre></blockquote><p>y</p></li></ul>'
  assert.equal(html('- > +\n  ```\n\n\n  y\n'), loose)
  assert.equal(html('- > +\n  ```\n\n  y\n'), loose)
  assert.equal(html('> - > +\n>   ```\n>\n>   y\n'), `<blockquote>${loose}</blockquote>`)
  assert.equal(html('- > +\n  ::: n\n  c\n\n  # h\n- z\n'),
    '<ul><li><blockquote><div class="n"><p>c</p></div></blockquote><h1 id="h">h</h1></li><li><p>z</p></li></ul>')
})

test('a quote marker glued to the plus is text, and a closed fence was already loose (carve#5510)', () => {
  assert.equal(html('1. >+\n   ```\n   c\n\n   # h\n'), '<ol><li>&gt;+<pre><code>c# h</code></pre></li></ol>')
  assert.equal(html('- >\t+\n  ```\n\n  y\n'), '<ul><li>&gt;\t+<pre><code>y</code></pre></li></ul>')
  assert.equal(html('- >  +\n  ```\n\n  y\n'), '<ul><li><blockquote><p>+</p></blockquote><pre><code>y</code></pre></li></ul>')
  assert.equal(html('- > +\n  ```c\n  ```\n\n\n  y\n'),
    '<ul><li><blockquote><pre><code class="language-c"></code></pre></blockquote><p>y</p></li></ul>')
})
