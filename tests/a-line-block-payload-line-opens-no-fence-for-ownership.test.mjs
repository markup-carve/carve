import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
const boxCode = html => html.match(/<div class="box">[\s\S]*?<pre><code>[\s\S]*?<\/code><\/pre>/)?.[0].match(/<pre><code>[\s\S]*?<\/code><\/pre>/)?.[0]

for (const [name, source, expected] of [
  ['row 1', '> - ::: box\n>   - ::: |\n>     PAYLOAD\n>     :::\n>    ```\n>    :::bad\n>    :::\n- tail\n', '<pre><code>:::bad\n:::\n</code></pre>'],
  ['row 3', '> - ::: box\n>   -   ::: |\n>       PAYLOAD\n>       :::\n>     ```\n>     :::\n>     :::bad\n>     :::\n- tail\n', '<pre><code>:::\n:::bad\n:::\n</code></pre>'],
]) {
  test(`${name} keeps box code independent of line-block payload shape`, () => {
    for (const payload of ['```', 'x', '~~~']) {
      const html = render(source.replace('PAYLOAD', payload))
      assert.equal(boxCode(html), expected, payload)
      assert.match(html, /<li>tail<\/li>/)
    }
  })
}

// An unclosed fence takes the box closer as content (carve#4018).
test('a fence outside a line block runs past the box closer', () => {
  const html = render('> - ::: box\n>    ```\n>    :::bad\n>    :::\n- tail\n')
  assert.equal(boxCode(html), '<pre><code>:::bad\n:::\n</code></pre>')
})

test('a box closer at its own column remains structural without an open code fence', () => {
  const html = render('- ::: box\n   ::: note\n   a\n   :::\n   :::\n- tail\n')
  assert.match(html, /<div class="box">\s*<aside class="admonition note"[\s\S]*?<\/aside>\s*<\/div>/)
  assert.doesNotMatch(html, /<p>:::<\/p>/)
  assert.match(html, /<li>tail<\/li>/)
})
