/*
 * A paragraph holding only braced comments is still a paragraph for S2: after a
 * blank it closes the frames its column misses, while directly under an open
 * paragraph it continues lazily and closes nothing (carve#5850).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const [name, src, out] of [
  ['below the item after a blank', '- a\n\n{% c %}\n\n  z\n', '<ul>\n  <li>a</li>\n</ul>\n<p>z</p>'],
  ['one column short after a blank', '- a\n\n {%%}\n\n  z\n', '<ul>\n  <li>a</li>\n</ul>\n<p>z</p>'],
  ['at the content column after a blank', '- a\n\n  {%%}\n\n  z\n', '<ul>\n  <li><p>a</p>\n    <p>z</p>\n  </li>\n</ul>'],
  ['a lazy continuation keeps the item', '- a\n{%%}\n  z\n', '<ul>\n  <li>a\n\nz</li>\n</ul>'],
  ['the sibling skip keeps one list', '- a\n\n{%%}\n\n- b\n', '<ul>\n  <li><p>a</p></li>\n  <li><p>b</p></li>\n</ul>'],
  ['a `%%` line is erased and keeps the item', '- a\n\n%% c\n\n  z\n', '<ul>\n  <li><p>a</p>\n    <p>z</p>\n  </li>\n</ul>'],
]) {
  test(`comment-only braced paragraph: ${name}`, () => assert.equal(html(src), out))
}
