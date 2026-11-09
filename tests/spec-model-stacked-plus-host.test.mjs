import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// carve#5532: a stacked marker-line `+` gives the inner item its block, and the item stays open after it.
test('a quote at the inner content column after a stacked plus fence stays in the inner item', () => {
  assert.equal(html('- - +\n  ```\n  - z\n\n    > q\n'), `<ul>
  <li>
    <ul>
      <li>
        <pre><code>- z
</code></pre>
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>`)
})

test('a quote after a closed stacked plus fence stays in the inner item', () => {
  for (const source of ['- - +\n  ```\n  code\n  ```\n    > q\n', '- [ ] - +\n      ```\n      code\n      ```\n        > q\n']) {
    assert.match(html(source), /<\/code><\/pre>\n {8}<blockquote><p>q<\/p><\/blockquote>\n {6}<\/li>/)
  }
})

test('an unclosed stacked plus colon block ends at its blank and the parent turns loose', () => {
  const doc = parse('- - +\n  ::: note\n  y\n\n  q\n')
  assert.equal(doc.blocks[0].tight, false)
  assert.match(renderDoc(doc), /<\/ul>\n {4}<p>q<\/p>\n {2}<\/li>/)
  assert.match(html('- - +\n  ::: note\n  y\n\n  q\n  :::\n'), /<p>y<\/p>\n {10}<p>q<\/p>\n {8}<\/aside>/)
})
