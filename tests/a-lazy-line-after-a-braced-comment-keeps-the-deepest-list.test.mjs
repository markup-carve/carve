import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a lazy line after an invisible comment leaves the nested list open for its sibling', () => {
  assert.equal(render('- a\n  - b\n{% c\n d %}\n tail\n\n  - z\n'), `<ul>
  <li>a
    <ul>
      <li><p>b

tail</p></li>
      <li><p>z</p></li>
    </ul>
  </li>
</ul>`)
})

test('an invisible comment leaves shifted and deeper list frames available', () => {
  const cases = [
    ['  - a\n    - b\n  {% c\n   d %}\n   tail\n\n    - z\n'],
    ['- a\n  - b\n    - c\n{% d\n e %}\n tail\n\n    - z\n'],
  ]
  for (const [source] of cases) {
    const html = render(source)
    assert.ok(html.includes('tail</p></li>') && html.includes('<li><p>z</p>'), source)
  }
})
