import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// CARVE-P0-024 S3: an indented description list reads as the unindented one (carve#4101).
const shapes = [
  ':: t\n: ```\n  code\n  ```\n +\n: c\n',
  ':: t\n: a\n\n +\n: c\n',
]

for (const source of shapes) {
  for (const by of ['  ', '   ']) {
    test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
      assert.equal(html(indent(source, by)), html(source))
    })
  }
}

test('a refused + keeps the separator after it as text (carve#4409)', () => {
  assert.match(html('  :: t\n  : ```\n    code\n    ```\n   +\n  : c\n'), /<\/dl>\n<p>\+\n: c<\/p>/)
})

test('a task item reads the shape as a plain item does', () => {
  const body = [':: t', ': ```', '  code', '  ```', ' +', ': c']
  const plain = body.map((l, k) => (k ? '  ' : '- ') + l).join('\n') + '\n'
  const task = body.map((l, k) => (k ? '      ' : '- [ ] ') + l).join('\n') + '\n'
  const strip = s => s.replace(/<ul class="task-list">/, '<ul>').replace(/<input type="checkbox" disabled> ?/, '').replace(/>\s+</g, '><')
  assert.equal(strip(html(task)), strip(html(plain)))
})
