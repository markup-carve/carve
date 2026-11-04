/*
 * A list marker on an off-stop tab run stands at its PART 9 §24 C5 column, so
 * a follower written on the very same run is a sibling, not a child
 * (carve#5116). A leading tab puts both measures on the same frame column.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const CASES = [
  ['a description', ':: t\n:  a\n\n   \t- x\n   \t- y\n',
    '<dl><dt>t</dt><dd><p>a</p><ul><li>x</li><li>y</li></ul></dd></dl>'],
  ['a list item', '- p\n\n   \t- x\n   \t- y\n',
    '<ul><li><p>p</p><ul><li>x</li><li>y</li></ul></li></ul>'],
  ['a description, follower past the marker\'s content column', ':: t\n:  a\n\n   \t- x\n   \t  - y\n',
    '<dl><dt>t</dt><dd><p>a</p><ul><li>x <ul><li>y</li></ul></li></ul></dd></dl>'],
  ['a description, leading tab', ':: t\n:  a\n\n\t- x\n   \t- y\n',
    '<dl><dt>t</dt><dd><p>a</p><ul><li>x <ul><li>y</li></ul></li></ul></dd></dl>'],
]

for (const [what, src, expected] of CASES) {
  test(`same tab run as the marker in ${what}`, () => {
    assert.equal(oracle(src), expected)
  })
}
