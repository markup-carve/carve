import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

for (const [below, expected] of [
  [' y', /<\/dl><p>y<\/p><pre><code>next<\/code><\/pre>$/],
  [' > y', /<\/dl><blockquote><p>y<\/p><\/blockquote><pre><code>next<\/code><\/pre>$/],
  [' > > +', /<\/dl><blockquote><blockquote><p>\+<\/p><\/blockquote><\/blockquote><pre><code>next<\/code><\/pre>$/],
  [' > > z', /<\/dl><blockquote><blockquote><p>z<\/p><\/blockquote><\/blockquote><pre><code>next<\/code><\/pre>$/],
]) {
  // carve#4018: the fence always opens; the below-column line ends it, and the later run opens anew.
  test(`a below-column line ends the description fence: ${below}`, () => {
    const out = html([':: term', ': body', '  ```', below, '  ```', 'next'].join('\n'))
    assert.match(out, expected)
    assert.match(out, /<dd><p>body<\/p><pre><code><\/code><\/pre><\/dd><\/dl>/)
  })
}

test('the below-column quote is read outside the description', () => {
  assert.equal(html(':: term\n: body\n  ```\n > y\n  ```\nnext'),
    '<dl><dt>term</dt><dd><p>body</p><pre><code></code></pre></dd></dl><blockquote><p>y</p></blockquote><pre><code>next</code></pre>')
})
