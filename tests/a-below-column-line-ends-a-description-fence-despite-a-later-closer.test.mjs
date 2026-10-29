import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

// The description fence opens without a closer (carve#4018) and the
// below-column line ends it. The later run opens a fence of its own there.
const empty = '<dl><dt>term</dt><dd><p>body</p><pre><code></code></pre></dd></dl>'
for (const [below, block] of [
  [' y', '<p>y</p>'],
  [' > y', '<blockquote><p>y</p></blockquote>'],
  [' > > +', '<blockquote><blockquote><p>+</p></blockquote></blockquote>'],
  [' > > z', '<blockquote><blockquote><p>z</p></blockquote></blockquote>'],
]) {
  test(`a below-column line ends the description fence: ${below}`, () => {
    const out = html([':: term', ': body', '  ```', below, '  ```', 'next'].join('\n'))
    assert.equal(out, empty + block + '<pre><code>next</code></pre>')
  })
}

test('the below-column quote is read outside the description', () => {
  assert.equal(html(':: term\n: body\n  ```\n > y\n  ```\nnext'),
    empty + '<blockquote><p>y</p></blockquote><pre><code>next</code></pre>')
})
