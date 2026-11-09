import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

test('an attached colon ends before the item sibling and a later div opens in the parent', () => {
  for (const [source, expected] of [
    ['- +\n::: x\n  - child\n  :::\nnext\n',
      ['doc/item:1', 'doc/item:1/div:2', 'doc/item:3', 'doc/div:4', 'doc/div:4']],
    ['- outer\n  - +\n  ::: x\n    - child\n    :::\n  tail\n',
      ['doc/item:1', 'doc/item:1/item:2', 'doc/item:1/item:2/div:3', 'doc/item:1/item:4', 'doc/item:1/div:5', 'doc/item:1/div:5']],
  ]) {
    const html = renderDoc(parse(source))
    const withTrace = renderDoc(parse(source, { trace: [] }))
    assert.equal(withTrace, html)
    assert.deepEqual(modelTrace(source).map((row) => row.owner), expected)
  }
})
