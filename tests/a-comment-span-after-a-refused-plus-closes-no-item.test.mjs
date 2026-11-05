import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// PART 0 FAMILIES list item `invisible`: a `%%%` span closes no item, so after a
// refused `+` it reads as a `%%` line does (CARVE-P9-067, carve#5170).
test('a comment span after a refused plus keeps the next line in the item', () => {
  const cases = [
    ['- +\n%%%\nx\n%%%\n  text\n', '<ul><li>text</li></ul>'],
    ['- a\n+\n%%%\nx\n%%%\n  text\n', '<ul><li>a text </li></ul>'],
    ['1. +\n%%%\nx\n%%%\n   text\n', '<ol><li>text</li></ol>'],
    [':: t\n: +\n%%%\nx\n%%%\n  text\n', '<dl><dt>t</dt><dd>text</dd></dl>'],
    ['- +\n%%%\nx\n%%%\n  - b\n', '<ul><li><ul><li>b</li></ul></li></ul>'],
    ['- +\n%%%\nx\n%%%\ntext\n', '<ul><li>text</li></ul>'],
  ]
  for (const [source, expected] of cases) {
    assert.equal(flat(source), expected, source)
    assert.equal(flat(source.replace('%%%\nx\n%%%\n', '%% c\n')), expected, `line form of ${source}`)
  }
})

test('a definition after a refused plus and a comment span registers in the item', () => {
  const html = flat('- +\n%%%\n[r]: /opaque\n%%%\n  [^n]: note\n\nSee [^n].\n')
  assert.match(html, /^<ul><li><\/li><\/ul><p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1<\/sup><\/a>\.<\/p>/)
  assert.match(html, /<li id="fn1"><p>note/)
})
