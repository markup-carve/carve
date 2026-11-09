import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

for (const [host, tail] of [['- +', ''], ['[^a]: +', '\nsee[^a]\n'], [':: t\n: +', '']]) {
  test(`a plus closes the host's own fence after "${host}" (#5583)`, () => {
    const output = html(host + '\np\n  ```\n+\n' + tail)
    assert.doesNotMatch(output, /%%/)
    assert.match(output, /<pre><code><\/code><\/pre>/)
  })
}

test('a plus closes a fence inside a note-attached list (#5583)', () => {
  const output = html('[^a]: +\n- li\n  ```\n+\n\nsee[^a]\n')
  assert.match(output, /<li>li\n          <pre><code><\/code><\/pre>\n        <\/li>/)
})

test('a plus closes a host fence after an attached quote (#5583)', () => {
  const output = html('- +\n> q\n  ```\n+\n')
  assert.match(output, /<blockquote><p>q<\/p><\/blockquote>\n    <pre><code><\/code><\/pre>\n  <\/li>/)
})

test('a root fence after a quote attachment keeps the plus as payload (#5583)', () => {
  assert.equal(html('> +\np\n  ```\n+\n').trim(), '<blockquote><p>p</p></blockquote>\n<pre><code>+\n</code></pre>')
})

test('a fence inside the quote-attached list still ends at the quoted plus', () => {
  assert.match(html('> +\n- li\n  ```\n> +\nr\n'), /<\/ul>\n  <p>\+\nr<\/p>\n<\/blockquote>/)
})
