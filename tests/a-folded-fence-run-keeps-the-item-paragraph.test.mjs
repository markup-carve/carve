import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

// A run below the item column misses the item, so it ends the item's fence
// and opens its own (carve#4018).
test('a fence run below the item column ends the item fence and opens its own', () => {
  assert.equal(render('- o\n  ```\n```\n\n  t\n'),
    '<ul>\n  <li>o\n    <pre><code></code></pre>\n  </li>\n</ul>\n<pre><code>\n  t\n</code></pre>')
  for (const run of ['```', '~~~']) {
    const source = `- o\n  ${run}\n${run}\n\n  t\n`
    assert.match(render(source), /<li>o\n\s*<pre><code><\/code><\/pre>/)
    assert.match(render(source), /<\/ul>\n<pre><code>\n  t\n<\/code><\/pre>$/)

    const blankBeforeCloser = `- h\n  ${run}\n\n  b\n${run}\n`
    const html = render(blankBeforeCloser)
    assert.match(html, /<li>h\n\s*<pre><code>\nb\n<\/code><\/pre>/)
    assert.match(html, /<\/ul>\n<pre><code><\/code><\/pre>$/)

    const letterInsteadOfCloser = `- o\n  ${run}\nx\n\n  t\n`
    assert.match(render(letterInsteadOfCloser), /<li>o\n\s*<pre><code><\/code><\/pre>/)
    assert.match(render(letterInsteadOfCloser), /<\/ul>\n<p>x<\/p>\n<p>t<\/p>$/)
  }
})

test('a nested fence run ends at the next below-column line', () => {
  assert.equal(render('- o\n  - h\n    ```\n```\n'),
    '<ul>\n  <li>o\n    <ul>\n      <li>h\n        <pre><code></code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code></code></pre>')
  for (const run of ['```', '~~~']) {
    const source = `- o\n  - h\n    ${run}\n${run}\n`
    const html = render(source)
    assert.match(html, /<li>h\n\s*<pre><code><\/code><\/pre>/)
    assert.match(html, /<\/ul>\n<pre><code><\/code><\/pre>$/)

    const letter = render(`- o\n  - h\n    ${run}\nx\n`)
    assert.match(letter, /<\/ul>\n<p>x<\/p>$/)
    assert.match(letter, /<li>h\n\s*<pre>/)
  }
})

test('folded fence work grows with the number of independent items', () => {
  const visits = count => {
    resetLayoutWork()
    parse('- o\n  ```\n```\n\n  t\n'.repeat(count))
    return layoutWork.lineVisits
  }
  const small = visits(128)
  const large = visits(256)
  assert.ok(small > 0)
  assert.ok(large <= 2 * small + 2, `128=${small}, 256=${large}`)
})
