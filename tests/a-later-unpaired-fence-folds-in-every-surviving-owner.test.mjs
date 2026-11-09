import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('an unpaired fence folds in the document after a stacked attached fence', () => {
  assert.match(html('- - +\n  ```\n\nx\n   ~~~\n'), /<p>x\n~~~<\/p>/)
})

test('an unpaired fence folds in an outer item two levels above the host', () => {
  const output = html('- - - +\n    ```\n\n  tail\n     ~~~\n')
  assert.match(output, /<p>tail\n~~~<\/p>/)
  assert.equal((output.match(/<pre>/g) ?? []).length, 1)
})

test('a paired later fence still opens as a block', () => {
  const output = html('- - - +\n    ```\n\n  tail\n     ~~~\n     ~~~\n')
  assert.match(output, /<p>tail<\/p>/)
  assert.equal((output.match(/<pre>/g) ?? []).length, 2)
})
