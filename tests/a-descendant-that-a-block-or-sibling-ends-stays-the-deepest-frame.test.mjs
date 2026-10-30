import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 0 S4 / CARVE-P0-006: a column-0 line folds into the deepest open
// paragraph, found the same way at every depth.
const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a block ending a grandchild list leaves the marker-line child the deepest frame', () => {
  assert.equal(html('- - a\n    - b\n    ||\nz\n'),
    '<ul><li><ul><li>a<ul><li>b</li></ul><table><tbody><tr><td></td></tr></tbody></table></li></ul></li></ul><p>z</p>')
})

test('a sibling that ends a nested fence opens the paragraph a lazy line folds into', () => {
  assert.equal(html('- - a\n    - ~~~\n  - y\nz\n'),
    '<ul><li><ul><li>a<ul><li><pre><code></code></pre></li></ul></li><li>yz</li></ul></li></ul>')
})

const markers = ['- ', '1. ', '* ', '- [ ] ']
const blocks = ['||', '# h', '---', '%% c', '{.x}']
for (const marker of markers) for (const depth of [2, 3, 4]) {
  const width = marker.length
  const chain = marker.repeat(depth) + 'a'
  const deep = ' '.repeat(width * depth)
  const child = ' '.repeat(width * (depth - 1))
  for (const block of blocks) for (const tail of ['z', ' z']) {
    test(`after a grandchild list a block at the child column leaves no paragraph: ${JSON.stringify(marker)}, depth ${depth}, ${block}, ${JSON.stringify(tail)}`, () => {
      const out = html([chain, deep + '- b', child + block, tail].join('\n') + '\n')
      assert.match(out, /<p>z<\/p>$/)
    })
  }
  test(`a sibling after a nested fence takes the lazy line: ${JSON.stringify(marker)}, depth ${depth}`, () => {
    const out = html([chain, deep + '- ~~~', child + marker + 'y', 'z'].join('\n') + '\n')
    assert.match(out, /yz<\/li>/)
  })
}
