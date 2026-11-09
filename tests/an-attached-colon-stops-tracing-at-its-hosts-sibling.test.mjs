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

test('the sibling closes both old frames and keeps its own attachments and fence payload', () => {
  const sibling = modelTrace('- +\n::: x\n  - child\n')
  assert.deepEqual([sibling[2].owner, sibling[2].closed, sibling[2].reached],
    ['doc/item:3', 2, 'doc'])

  const attached = modelTrace('- +\n::: x\n  - +\n  > q\n')
  assert.equal(attached[3].plus, 3)
  assert.equal(attached[3].owner, 'doc/item:3/quote:4')

  const fenced = '- +\n::: x\n  - child\n  ```\n- payload\n  ```\n'
  const trace = []
  assert.equal(renderDoc(parse(fenced, { trace })), renderDoc(parse(fenced)))
  assert.deepEqual(trace.slice(3).map(({ form, owner }) => [form, owner]), [
    ['code', 'doc/code:4'],
    ['payload', 'doc/code:4'],
    ['closer', 'doc/code:4'],
  ])
})

test('a following attached host uses the newly opened parent div', () => {
  const source = '- +\n::: x\n  - child\n  :::\n- +\n::: y\n  - other\n  :::\n'
  const trace = []
  assert.equal(renderDoc(parse(source, { trace })), renderDoc(parse(source)))
  assert.deepEqual(trace.slice(4).map(({ form, owner }) => [form, owner]), [
    ['item', 'doc/div:4/item:5'],
    ['div', 'doc/div:4/item:5/div:6'],
    ['item', 'doc/div:4/item:7'],
    ['closer', 'doc/div:4'],
  ])
})
