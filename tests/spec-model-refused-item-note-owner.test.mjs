import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a refused marker in an item-hosted note returns the next block to the item (carve#5515)', () => {
  const source = '- h\n  [^a]: +\n  +\n\n    > q\n'
  assert.equal(renderDoc(parse(source)).trim(), '<ul>\n  <li><p>h</p>\n    <blockquote><p>q</p></blockquote>\n  </li>\n</ul>')
})
