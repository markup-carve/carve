import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const dds = out => [...out.matchAll(/<dd>([^]*?)<\/dd>/g)].map(m => m[1].trim())

// CARVE-P0-008 and CARVE-P0-024 S3: a `: ` line at its term's column opens the
// next description wherever the term stands (carve#4094).
test('a second description after a task item term opens its own dd', () => {
  assert.deepEqual(dds(html('- [ ] :: t\n      : a\n      : b\n')), ['a', 'b'])
  assert.deepEqual(dds(html('- [x] :: t\n      : a\n      : b\n      : c\n')), ['a', 'b', 'c'])
})

test('a fence on the second description line opens in its dd', () => {
  assert.deepEqual(dds(html('- [ ] :: t\n      : a\n      : ```\n        code\n        ```\n')),
    ['a', '<pre><code>code\n</code></pre>'])
})

for (const indent of ['  ', '   ', '\t']) {
  test(`an indented description list (${JSON.stringify(indent)}) reads as an unindented one`, () => {
    const lines = [':: t', ': a', ': b']
    assert.deepEqual(dds(html(lines.map(l => indent + l).join('\n') + '\n')), dds(html(lines.join('\n') + '\n')))
  })
}

test('a task item reads its description list as a plain item does', () => {
  for (const marker of ['- ', '* ', '- - ']) {
    const body = [':: t', ': a', ': b', ':: u', ': c']
    const plain = body.map((l, k) => (k ? ' '.repeat(marker.length) : marker) + l).join('\n') + '\n'
    const task = body.map((l, k) => (k ? ' '.repeat(marker.length + 4) : marker + '[ ] ') + l).join('\n') + '\n'
    assert.deepEqual(dds(html(task)), dds(html(plain)))
  }
})

test('a lazy line below the term column still folds', () => {
  assert.deepEqual(dds(html(':: t\n: a\nb\n')), ['a\nb'])
  assert.deepEqual(dds(html('- [ ] :: t\n      : a\n      b\n')), ['a\nb'])
})
