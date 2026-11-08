import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a blank between child lists after an attached fence loosens the parent', () => {
  const source = '- a\n  - +\n    ```\n  * z\n\n  - q\n'
  const doc = parse(source)
  assert.equal(doc.blocks[0].tight, false)
  assert.equal(doc.blocks[0].items[0].blocks.filter(block => block.t === 'list').length, 3)
  assert.match(renderDoc(doc), /<li><p>a<\/p>/)
})

test('a blank inside a child attached fence does not loosen the parent', () => {
  const source = '- a\n  - +\n  ```\n  - z\n\n    q\n'
  const doc = parse(source)
  assert.equal(doc.blocks[0].tight, true)
  assert.equal(doc.blocks[0].items[0].blocks[1].tight, false)
  assert.match(renderDoc(doc), /<li>a\n/)
})
