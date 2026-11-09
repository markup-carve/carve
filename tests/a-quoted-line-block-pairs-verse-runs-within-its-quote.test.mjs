import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a quoted line block does not pair a verse run past the quote exit', () => {
  const html = renderDoc(parse('> - ::: |\n>   ```\nz\n>   ```'))
  assert.equal(html, `<blockquote>
  <ul>
    <li>
      <div class="line-block">
        <p><code>
z
</code></p>
      </div>
    </li>
  </ul>
</blockquote>`)
})
