import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// CARVE-P2-035: a block run needs every quote prefix on every line (#5830).
const escaped = source => html(source.replace('{', '\\{'))
test('a nested run with one quote prefix missing is refused at every column', () => {
  for (const source of ['> > {.x\n>    .y}\nplain', '> > {.x\n>   .y}\nplain',
    '> >  {.x\n>     .y}', '> >  {.x\n>    .y}']) {
    assert.equal(html(source), escaped(source), source)
  }
})

test('a valid quoted run on an item marker line leaves no paragraph for a column-zero line', () => {
  assert.equal(html('- > {.x\n  >  .y}\nplain'),
    '<ul>\n  <li>\n    <blockquote>\n\n    </blockquote>\n  </li>\n</ul>\n<p>plain</p>')
  assert.equal(html('- > {.x\n  > .y}\nplain'),
    '<ul>\n  <li>\n    <blockquote><p>{.x\n.y}\nplain</p></blockquote>\n  </li>\n</ul>')
})

// A refused opener is literal; its later lines follow ordinary inline rules (#5830).
test('a refused quoted run with a lazy continuation follows the escaped opener', () => {
  for (const source of ['- > {#a\n   .y}', '> - {#a\n   .y}',
    '> {#a\n  .y}', '> {#a\n   .y}']) {
    assert.equal(html(source), escaped(source), source)
  }
})

test('a quoted item marker-line run with only the outer quote prefix refuses', () => {
  for (const source of ['> - > {.x\n>      .y}\nplain', '> - > {.x\n>     .y}\nplain']) {
    assert.equal(html(source), escaped(source), source)
  }
})

test('an unclosed quoted run on an item marker line keeps its paragraph for the next line', () => {
  assert.equal(html('- > {#a\n  >    junk\nplain'),
    '<ul>\n  <li>\n    <blockquote><p>{<span class="tag"><strong>#a</strong></span>\njunk\nplain</p></blockquote>\n  </li>\n</ul>')
})
