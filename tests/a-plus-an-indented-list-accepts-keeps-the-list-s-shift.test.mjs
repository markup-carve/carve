import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: a lone `+` past an indented list's marker column is that list's
// marker, so the lines it attaches move with the list (carve#4120).
test('the ruled carve#4120 shape reads the same indented by two', () => {
  const source = ':: t\n: ```\n +\n> q\n: a\n'
  const expected = '<dl>\n  <dt>t</dt>\n  <dd>\n    <pre><code></code></pre>\n    <blockquote><p>q</p></blockquote>\n  </dd>\n  <dd>a</dd>\n</dl>'
  assert.equal(html(source), expected)
  assert.equal(html(indent(source, '  ')), expected)
})

const heads = [':: t\n: ```', ':: t\n: x', '- a\n  ```', '1. a\n   ```', '- [ ] a\n  ```', '- a\n - y', '[^n]: n\n    ```']
const pluses = [' +', '  +', '+']
const nexts = ['p', '> q\n: a', '> q\np', ': a', '- y', '# H\n: a', '+\np']

for (const head of heads) {
  for (const plus of pluses) {
    for (const next of nexts) {
      const source = `${head}\n${plus}\n${next}\n`
      for (const by of [' ', '  ', '   ']) {
        test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
          assert.equal(html(indent(source, by)), html(source))
        })
      }
    }
  }
}
