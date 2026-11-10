import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('an unclosed fence opener ends comment closer lookahead', () => {
  assert.equal(html('p {% x %} {% y\n{k=v}\n```\nz %}\n'),
    '<p>p  {% y</p>\n<pre k="v"><code>z %}\n</code></pre>')
})

test('a sublist marker ends comment closer lookahead in an item', () => {
  assert.equal(html('- a {% x\n  {k=v}\n  - l\n  z %}\n'),
    '<ul>\n  <li>a {% x\n    <ul k="v">\n      <li>l\nz %}</li>\n    </ul>\n  </li>\n</ul>')
})

test('a closer before the next block still holds the brace line', () => {
  assert.equal(html('p {% a\n{k=v}\nb %}\n```\nz\n'),
    '<p>p </p>\n<pre><code>z\n</code></pre>')
})
