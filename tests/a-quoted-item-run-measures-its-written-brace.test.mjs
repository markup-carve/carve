import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const refused = source => html(source).includes('{.x')

// CARVE-P2-035 and carve#5830: the written brace column still applies after
// every quote prefix. An unprefixed continuation refuses a multiline run.
const firstValidColumn = (head, end = '') => {
  for (let column = 0; column < 40; column++) if (!refused(`${head}{.x${end}\n${' '.repeat(column)}.y}\nplain`)) return column
  return null
}

test('a quoted item run refuses an unprefixed continuation at every column', () => {
  for (const [head, brace] of [
    ['> - ', 4], ['> -{.a} ', 8], ['> -{.a .b} ', 11], ['> 1.{#i} ', 9], ['> -{.a} [ ] ', 12],
    ['>  - ', 5], ['>   - ', 6], ['>  -{.a} ', 9], ['> \t- ', 6], ['> \t-{.a} ', 10],
    ['> > - ', 6], ['> > 1. ', 7], ['> >  - ', 7], ['> > -{.a} ', 10], ['>  >  - ', 8], ['>  > ', 5],
  ]) assert.equal(firstValidColumn(head), null, `${head} at ${brace}`)
})

test('trailing whitespace after the opener does not hide its brace', () => {
  for (const [head, brace] of [['> ', 2], ['> - ', 4], ['> > - ', 6], ['>  - ', 5], ['> 1. ', 5]])
    for (const end of [' ', '\t']) assert.equal(firstValidColumn(head, end), null, JSON.stringify(head + end))
})

test('a valid quoted item run leaves no paragraph for the follower', () => {
  assert.equal(html('> > - {.x\n> >    .y}\nplain'),
    '<blockquote>\n  <blockquote>\n    <ul>\n      <li></li>\n    </ul>\n  </blockquote>\n</blockquote>\n<p>plain</p>')
  const unprefixed = '> -{.a} {.x\n         .y}\nplain'
  assert.equal(html(unprefixed), html(unprefixed.replace('{.x', '\\{.x')))
})
