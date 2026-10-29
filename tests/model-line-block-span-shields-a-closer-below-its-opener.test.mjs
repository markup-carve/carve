import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a span in an item line block keeps its closer line as written (carve#4081 shape 13)', () => {
  assert.equal(html('- ::: |\n    ```\n  :::\n   ```\n'),
    '<ul>\n  <li>\n    <div class="line-block">\n      <p>&nbsp;&nbsp;<code>\n:::\n&nbsp;</code></p>\n    </div>\n  </li>\n</ul>')
})

test('the item reads the line block like the document does', () => {
  const inner = (src) => /<p>[\s\S]*?<\/p>/.exec(html(src))[0]
  assert.equal(inner('- ::: |\n    ```\n  :::\n   ```\n'), inner('::: |\n  ```\n:::\n ```\n'))
})
