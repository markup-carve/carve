import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const refused = source => html(source).includes('{.x')

// CARVE-P2-035 and carve#5619: an unprefixed continuation is compared with the
// `{` where it is written, however the quote's reader rewrote the line (carve#5826).
const firstValidColumn = head => {
  for (let column = 0; column < 40; column++) if (!refused(`${head}{.x\n${' '.repeat(column)}.y}\nplain`)) return column
  return null
}

test('a quoted item run is valid one column past its written brace', () => {
  for (const [head, brace] of [
    ['> - ', 4], ['> -{.a} ', 8], ['> -{.a .b} ', 11], ['> 1.{#i} ', 9], ['> -{.a} [ ] ', 12],
    ['>  - ', 5], ['>   - ', 6], ['>  -{.a} ', 9], ['> \t- ', 6], ['> \t-{.a} ', 10],
    ['> > - ', 6], ['> > 1. ', 7], ['> >  - ', 7], ['> > -{.a} ', 10], ['>  >  - ', 8], ['>  > ', 5],
  ]) assert.equal(firstValidColumn(head), brace + 1, head)
})

test('a valid quoted item run leaves no paragraph for the follower', () => {
  assert.equal(html('> > - {.x\n> >    .y}\nplain'),
    '<blockquote>\n  <blockquote>\n    <ul>\n      <li></li>\n    </ul>\n  </blockquote>\n</blockquote>\n<p>plain</p>')
  assert.equal(html('> -{.a} {.x\n         .y}\nplain'),
    '<blockquote>\n  <ul>\n    <li class="a"></li>\n  </ul>\n</blockquote>\n<p>plain</p>')
})
