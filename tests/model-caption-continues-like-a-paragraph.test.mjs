import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// CARVE-P2-021: a caption, bound or not, spills onto following lines like a paragraph.
for (const [name, src, out] of [
  ['an unbound caption line', '^ p\n- [^f]: t\n]\n', '<p>^ p\n- [^f]: t\n]</p>'],
  ['a caption under a paragraph', 'x\n^ p\n- [^f]: t\n]\n', '<p>x\n^ p\n- [^f]: t\n]</p>'],
  ['a table caption', '| a |\n^ p\n- [^f]: t\n]\n',
    '<table>\n  <caption>p\n- [^f]: t\n]</caption>\n  <tbody>\n    <tr><td>a</td></tr>\n  </tbody>\n</table>'],
]) {
  test(`${name} keeps a marker line and its follower as text`, () => {
    const doc = parse(src)
    assert.equal(html(src), out)
    assert.equal(doc.footnoteDefs.size, 0)
  })
}

test('in a list item a marker ends a caption as it ends a paragraph', () => {
  assert.equal(html('- | a |\n  ^ p\n  - b\n'),
    '<ul>\n  <li>\n    <table>\n      <caption>p</caption>\n      <tbody>\n        <tr><td>a</td></tr>\n      </tbody>\n    </table>\n    <ul>\n      <li>b</li>\n    </ul>\n  </li>\n</ul>')
})
