import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const fence of ['```', '~~~']) for (const lead of ['{.x', '{#id']) {
  test(`description paragraph owns short text after a refused ${fence} follower from ${lead}`, () => {
    const src = `:: term\n: ${lead}\n  }\n  ${fence}\nplain\n`
    const out = html(src)
    assert.match(out, /<dd>/)
    assert.doesNotMatch(out, /<\/dl>\n<p>plain<\/p>/)
    assert.match(out, /plain(?:<\/code>)?<\/dd>\n<\/dl>$/)
  })
}

test('a fence outside a nested item still opens in the description', () => {
  const src = ':: t\n: - a\n    {.x\n    }\n  ```\nplain\n'
  assert.equal(html(src), '<dl>\n  <dt>t</dt>\n  <dd>\n    <ul>\n      <li>a\n{.x\n}</li>\n    </ul>\n    <pre><code></code></pre>\n  </dd>\n</dl>\n<p>plain</p>')
})

test('a fence after a lazy refused list continuation opens in the description', () => {
  const src = ':: t\n: - a\n  {.x\n  }\n  ```\nplain\n'
  const out = html(src)
  assert.match(out, /<pre><code><\/code><\/pre>/)
  assert.match(out, /<\/dd>\n<\/dl>\n<p>plain<\/p>$/)
})

test('a fence at an outer item column leaves the inner refused paragraph', () => {
  const src = ':: t\n: - - a\n      {.x\n      }\n    ```\nplain\n'
  const out = html(src)
  assert.match(out, /<pre><code><\/code><\/pre>/)
  assert.match(out, /<p>plain<\/p>\n  <\/dd>\n<\/dl>$/)
})
