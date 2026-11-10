import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// CARVE-P2-035: a continuation is read past the quote prefixes it has, however few.
test('a nested run continued under one quote prefix fewer is valid one column past its brace', () => {
  assert.equal(html('> > {.x\n>    .y}\nplain'),
    '<blockquote>\n  <blockquote>\n\n  </blockquote>\n</blockquote>\n<p>plain</p>')
  assert.equal(html('> > {.x\n>   .y}\nplain'),
    '<blockquote>\n  <blockquote><p>{.x\n.y}\nplain</p></blockquote>\n</blockquote>')
  assert.equal(html('> >  {.x\n>     .y}'), '<blockquote>\n  <blockquote>\n\n  </blockquote>\n</blockquote>')
  assert.equal(html('> >  {.x\n>    .y}'), '<blockquote>\n  <blockquote><p>{.x\n.y}</p></blockquote>\n</blockquote>')
})

test('a valid quoted run on an item marker line leaves no paragraph for a column-zero line', () => {
  assert.equal(html('- > {.x\n  >  .y}\nplain'),
    '<ul>\n  <li>\n    <blockquote>\n\n    </blockquote>\n  </li>\n</ul>\n<p>plain</p>')
  assert.equal(html('- > {.x\n  > .y}\nplain'),
    '<ul>\n  <li>\n    <blockquote><p>{.x\n.y}\nplain</p></blockquote>\n  </li>\n</ul>')
})

// CARVE-P2-035 and PART 4 block_attributes: a refused run is literal paragraph text in every owner.
test('a refused quoted run with a lazy continuation reads no tag', () => {
  assert.equal(html('- > {#a\n   .y}'), '<ul>\n  <li>\n    <blockquote><p>{#a\n.y}</p></blockquote>\n  </li>\n</ul>')
  assert.equal(html('> - {#a\n   .y}'), '<blockquote>\n  <ul>\n    <li>{#a\n.y}</li>\n  </ul>\n</blockquote>')
  assert.equal(html('> {#a\n  .y}'), '<blockquote><p>{#a\n.y}</p></blockquote>')
  assert.equal(html('> {#a\n   .y}'), '<blockquote>\n\n</blockquote>')
})
