import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#5755 (ruling C): a frame is reached by a line's per-frame column, so a
// tab lead that reaches a nested item only from the line start belongs to the parent.
const cases = [
  ['the carve#5755 shape', '- a\n \t  - a\n \t\t{.x}\n\t       > z\n', '- a\n      - a\n      {.x}\n           > z\n'],
  ['a paragraph after a blank', '- a\n \t  - a\n\n \t\tb\n', '- a\n      - a\n\n      b\n'],
  ['a quote after a blank', '- a\n \t  - a\n\n \t\t> z\n', '- a\n      - a\n\n      > z\n'],
  ['a note-nested item', '[^n]: a\n    1. a\n\n\t\tb\n\nx[^n]\n', '[^n]: a\n    1. a\n\n      b\n\nx[^n]\n'],
  // A marker on a tab run stands at its per-frame column, so a space-led follower is compared there too.
  ['a space-led line under a tab-led marker', '- a\n  \t- a\n\n      b\n', '- a\n      - a\n\n      b\n'],
  ['a space-led quote under a tab-led marker', '- a\n  \t- a\n      > z\n', '- a\n      - a\n      > z\n'],
]
for (const [name, tabbed, spaced] of cases) {
  test(`${name} reads as its per-frame space spelling`, () => {
    assert.equal(html(tabbed), html(spaced))
  })
}

test('the carve#5755 shape gives the quote to the outer item', () => {
  assert.equal(html('- a\n \t  - a\n \t\t{.x}\n\t       > z\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li>a</li>\n    </ul>\n    <blockquote class="x"><p>z</p></blockquote>\n  </li>\n</ul>')
})

test('a tab lead that reaches the nested item per frame stays in it', () => {
  assert.match(html('- a\n \t  - a\n\n \t\t  b\n'), /<li><p>a<\/p>\n\s*<p>b<\/p>\n\s*<\/li>\n\s*<\/ul>\n\s*<\/li>/)
})
