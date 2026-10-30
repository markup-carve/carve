import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a sibling marker refuses a description-hosted first block without loosening its list', () => {
  const source = ':: t\n: - +\n  - z\n'
  const list = parse(source).blocks[0].items[1].ddBlocks[0]
  assert.equal(list.tight, true)
  assert.deepEqual(list.items[0].blocks, [{ t: 'para', lines: ['+'] }])
  assert.deepEqual(list.items[1].blocks, [{ t: 'para', lines: ['z'] }])
})

test('a document-column follower folds into the refused + of the hosted item (carve#4356)', () => {
  const doc = parse(':: t\n: - +\nx\n')
  assert.deepEqual(doc.blocks[0].items[1].ddBlocks[0].items[0].blocks, [{ t: 'para', lines: ['+', 'x'] }])
  assert.equal(doc.blocks.length, 1)
})

test('a follower at the marker column is the hosted item\'s block', () => {
  const source = ':: t\n: - +\n  x\n'
  const doc = parse(source)
  assert.deepEqual(doc.blocks[0].items[1].ddBlocks[0].items[0].blocks, [{ t: 'para', lines: ['x'] }])
  assert.equal(doc.blocks.length, 1)
})

test('a later heading at the footnote body floor remains a block', () => {
  const source = '- see[^n]\n  [^n]: +\n  x\n    # z\n\nsee[^n]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn1">\n      <p>x<\/p>\n      <h1 id="z">z<\/h1>/)
})
