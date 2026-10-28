import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

for (const [below, expected] of [
  [' y', /<dd><p>body<\/p><pre><code><\/code><\/pre><\/dd><\/dl><p>y<code>\nnext<\/code><\/p>$/],
  [' > y', /<dd>body<code><\/code><\/dd><\/dl><blockquote><p>y<code>\nnext<\/code><\/p><\/blockquote>$/],
  [' > > +', /<dd>body<code><\/code><\/dd><\/dl><blockquote><blockquote><p>\+<code>\nnext<\/code><\/p><\/blockquote><\/blockquote>$/],
  [' > > z', /<dd>body<code><\/code><\/dd><\/dl><blockquote><blockquote><p>z<code>\nnext<\/code><\/p><\/blockquote><\/blockquote>$/],
]) {
  test(`a below-column line decides whether the description fence opens: ${below}`, () => {
    const out = html([':: term', ': body', '  ```', below, '  ```', 'next'].join('\n'))
    assert.match(out, expected)
    assert.doesNotMatch(out, /<pre><code>[^<]+<\/code><\/pre>/)
  })
}

test('the below-column quote is read outside the description', () => {
  assert.equal(html(':: term\n: body\n  ```\n > y\n  ```\nnext'),
    '<dl><dt>term</dt><dd>body<code></code></dd></dl><blockquote><p>y<code>\nnext</code></p></blockquote>')
})
