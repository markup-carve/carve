/*
 * A `: ` line at a marker-line child's marker column opens nothing while the
 * child holds a paragraph, so it folds there and the child keeps the lines
 * below (PART 0 S4, carve#4175). Under an open term it still ends the child.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\n */g, '\n').trim()

for (const [lead, text] of [[': b', ': b'], [':  b', ':  b'], [': `c`', ': <code>c</code>']]) {
  test(`${lead} folds into the child's paragraph and the child takes the quote`, () => {
    assert.equal(html(`- - a\n  ${lead}\n    > q\n`),
      `<ul>\n<li>\n<ul>\n<li>a\n${text}\n<blockquote><p>q</p></blockquote>\n</li>\n</ul>\n</li>\n</ul>`)
  })
}

test('under an open term the separator still ends the child', () => {
  assert.equal(html('- * :: t\n  : a\n    tail\n'), '<ul>\n<li>\n<ul>\n<li>\n<dl>\n<dt>t</dt>\n</dl>\n</li>\n</ul>\n: a\ntail\n</li>\n</ul>')
})
