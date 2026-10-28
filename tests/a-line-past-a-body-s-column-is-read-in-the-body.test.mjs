/*
 * A list-shaped line under a description or footnote body's open paragraph
 * folds into it (PART 9 §10 I2) and opens no item, so a line past the body's
 * column is read in the body: a definition registers (CARVE-P0-020, ruled on
 * carve#3279) and a heading or attribute line opens on its authored base
 * (CARVE-P0-004). A block quote does not rebase, so a definition one column
 * past its marker is text (carve#3280).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const link = '<p><a href="/u">r</a></p>'

const CASES = [
  ['a definition after a folded bullet', ':: t\n: d\n  - para\n    [r]: /u\nx\n\n[r][]\n',
    `<dl><dt>t</dt><dd>d - para</dd></dl><p>x</p>${link}`],
  ['a definition after a folded ordered marker', ':: t\n: d\n  1. para\n     [r]: /u\nx\n\n[r][]\n',
    `<dl><dt>t</dt><dd>d 1. para</dd></dl><p>x</p>${link}`],
  ['a heading after a folded bullet', ':: t\n: d\n  - para\n    # H\nx\n',
    '<dl><dt>t</dt><dd><p>d - para</p><h1 id="H">H</h1></dd></dl><p>x</p>'],
  ['an attribute line after a folded bullet', ':: t\n: d\n  - para\n    {#k}\nx\n',
    '<dl><dt>t</dt><dd>d - para</dd></dl><p>x</p>'],
  ['an over-indented definition in a quoted item', '- > para\n  >  [r]: /u\ntail\n\n[r][]\n',
    '<ul><li><blockquote><p>para [r]: /u tail</p></blockquote></li></ul><p>[r][]</p>'],
  ['an over-indented footnote definition in a quoted item', '- > para\n  >  [^f]: n\ntail\n',
    '<ul><li><blockquote><p>para [^f]: n tail</p></blockquote></li></ul>'],
  ['an over-indented definition in a quoted item in a quote', '> - > para\n>   >  [r]: /u\ntail\n\n[r][]\n',
    '<blockquote><ul><li><blockquote><p>para [r]: /u tail</p></blockquote></li></ul></blockquote><p>[r][]</p>'],
]

for (const [what, src, expected] of CASES) {
  test(`${what} is read where the clauses place it`, () => {
    assert.equal(oracle(src), expected)
  })
}

test('a footnote body reads a definition past its column after a folded bullet', () => {
  const ast = parse('[^n]: d\n  - para\n    [r]: /u\nx\n\n[^n]\n')
  assert.equal(ast.linkDefs.get('r')?.url, '/u')
  assert.match(oracle('[^n]: d\n  - para\n    [r]: /u\nx\n\n[^n]\n'), /^<p>x<\/p><p>/)
})

// Controls: a definition past a quoted item's column still registers there
// (CARVE-P0-020), and an abbreviation inside a body stays text.
test('a definition past a quoted sub-item column registers', () => {
  assert.equal(oracle('- > - x\n  >    [r]: /u\ntail\n\n[r][]\n'),
    `<ul><li><blockquote><ul><li>x</li></ul></blockquote></li></ul><p>tail</p>${link}`)
})
test('an abbreviation after a folded bullet stays text', () => {
  assert.equal(oracle(':: t\n: d\n  - para\n    *[A]: b\nx\n'),
    '<dl><dt>t</dt><dd>d - para *[A]: b x</dd></dl>')
})
