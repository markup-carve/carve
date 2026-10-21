import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

for (const below of [' y', ' > y', ' > > +', ' > > z']) {
  test(`a closer past a below-column line still opens the description fence: ${below}`, () => {
    const out = html([':: term', ': body', '  ```', below, '  ```', 'next'].join('\n'))
    assert.match(out, /<dd><p>body<\/p><pre><code><\/code><\/pre><\/dd><\/dl>/)
    assert.doesNotMatch(out, /<pre><code>[^<]+<\/code><\/pre>/)
  })
}

test('the below-column quote is read outside the description', () => {
  assert.equal(html(':: term\n: body\n  ```\n > y\n  ```\nnext'),
    '<dl><dt>term</dt><dd><p>body</p><pre><code></code></pre></dd></dl><p>&gt; y<code>\nnext</code></p>')
})
