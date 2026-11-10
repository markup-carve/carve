import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a note definition after a refused run remains in the list-hosted note paragraph (#5609)', () => {
  const source = '- [^a]: +\n  {#i\n  .y}\n  [^b]: z\n\nsee[^a][^b]\n'
  assert.equal(renderDoc(parse(source)).trim(), renderDoc(parse(source.replace('{', '\\{'))).trim())
})
