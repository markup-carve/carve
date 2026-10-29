import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// CARVE-P0-024 S3: a `+` and the block it attaches are measured from the term's
// own column, so an indented description list reads as at column 0 (carve#4120).
const shapes = [
  ':: t\n : d\n+\np\n',
  ':: t\n+\n: c\n+\np\n',
  ':: t\n:  d\n:  detail\n+\n```\ncode\n```\n',
]

for (const source of shapes) {
  for (const by of ['  ', '   ']) {
    test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
      assert.equal(html(indent(source, by)), html(source))
    })
  }
}

test('a + at a nested description marker attaches the fence to it', () => {
  const out = html(':: t\n    :: term\n :  d\n   :  detail\n   +\n   ```\n   code\n   ```\n')
  assert.match(out, /<dd>\n    <p>detail<\/p>\n    <pre><code>code\n<\/code><\/pre>\n  <\/dd>/)
})
