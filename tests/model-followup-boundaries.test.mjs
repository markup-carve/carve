import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a sibling marker refuses a description-hosted first block without loosening its list', () => {
  const source = ':: t\n: - +\n  - z\n'
  const list = parse(source).blocks[0].items[1].ddBlocks[0]
  assert.equal(list.tight, true)
  assert.deepEqual(list.items[0].blocks, [])
  assert.deepEqual(list.items[1].blocks, [{ t: 'para', lines: ['z'] }])
})

test('a refused document-column follower leaves the description', () => {
  const source = ':: t\n: - +\nx\n'
  const doc = parse(source)
  assert.equal(doc.blocks[0].items[1].ddBlocks[0].items[0].blocks.length, 0)
  assert.deepEqual(doc.blocks[1], { t: 'para', lines: ['x'] })
})

test('a later heading at the footnote body floor remains a block', () => {
  const source = '- see[^n]\n  [^n]: +\n  x\n    # z\n\nsee[^n]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn1">\n      <p>x<\/p>\n      <h1 id="z">z<\/h1>/)
})
