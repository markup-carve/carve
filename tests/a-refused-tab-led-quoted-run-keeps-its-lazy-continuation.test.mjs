import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

// carve#5828: a tab before a quoted run's `{` widens to its source tab stop (CARVE-P2-035).
test('a tab-led quoted run refused at its brace column keeps its lazy line', () => {
  assert.equal(render('>   \t{.x\n        .y}\n'), '<blockquote><p>{.x\n.y}</p></blockquote>')
  assert.equal(render('> \t{.x\n    .y}\n'), '<blockquote><p>{.x\n.y}</p></blockquote>')
})

test('a tab-led quoted run without a prefix on its continuation refuses', () => {
  assert.equal(render('>   \t{.x\n         .y}\n> z\n'), '<blockquote><p>{.x\n.y}\nz</p></blockquote>')
  assert.equal(render('> \t{.x\n     .y}\n> z\n'), '<blockquote><p>{.x\n.y}\nz</p></blockquote>')
})

test('a refused tab-led run in a nested quote keeps its lazy line in that quote', () => {
  const kept = '<blockquote>\n  <blockquote><p>{.x\n.y}</p></blockquote>\n</blockquote>'
  assert.equal(render('> > \t{.x\n>      .y}\n'), kept)
  assert.equal(render('> > \t{.x\n>       .y}\n'), kept)
})

test('a nested quoted run requires its quote prefixes on every continuation', () => {
  const run = '<blockquote>\n  <blockquote><p>{.x\n.y}\nz</p></blockquote>\n</blockquote>'
  assert.equal(render('> > \t{.x\n>        .y}\n> > z\n'), run)
  assert.equal(render('> >  {.x\n>     .y}\n> > z\n'), run)
  assert.equal(render('> >  {.x\n>    .y}\n> > z\n'), '<blockquote>\n  <blockquote><p>{.x\n.y}\nz</p></blockquote>\n</blockquote>')
})
