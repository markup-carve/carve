import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Not a corpus row: the pinned writer throws on this shape (carve-js#4007).
test('a refused + in a note-hosted stacked item folds the lines below it (carve#4222)', () => {
  const html = renderDoc(parse('[^a]: - - +\n  para\ntail\n\nr[^a]\n'))
  assert.ok(html.includes('<li>+\npara\ntail</li>'), html)
  assert.ok(!html.includes('\u0000'))
})
