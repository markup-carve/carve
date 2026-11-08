import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a refused marker in an item-hosted note returns the next block to the item (carve#5515)', () => {
  const source = '- h\n  [^a]: +\n  +\n\n    > q\n'
  assert.equal(renderDoc(parse(source)).trim(), '<ul>\n  <li><p>h</p>\n    <blockquote><p>q</p></blockquote>\n  </li>\n</ul>')
})

test('a refused marker in a note with content keeps the next block in the note', () => {
  const source = '- h\n  [^a]: x\n  +\n    > q\n\nr[^a]\n'
  const doc = parse(source)
  assert.equal(doc.footnoteDefs.get('a')[1]?.t, 'quote')
  assert.match(renderDoc(doc), /<blockquote><p>q<\/p><\/blockquote>/)
})
