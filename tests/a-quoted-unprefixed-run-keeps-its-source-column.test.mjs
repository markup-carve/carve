import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// CARVE-P2-035 and carve#5619: a continuation's written column is compared
// with the opening brace after any quote prefixes, at every quote depth.
test('a valid unprefixed run two quotes deep leaves no lazy paragraph', () => {
  assert.equal(html('> > {.x\n     .y}\nplain'),
    html('> > \\{.x\n     .y}\nplain'))
  assert.equal(html('> > {.x\n    .y}\nplain'),
    '<blockquote>\n  <blockquote><p>{.x\n.y}\nplain</p></blockquote>\n</blockquote>')
})

test('a tab before the brace preserves its measured source column', () => {
  assert.equal(html('> \t{.x\n     .y}\nplain'), html('> \t\\{.x\n     .y}\nplain'))
  assert.equal(html('> \t{.x\n    .y}\nplain'),
    '<blockquote><p>{.x\n.y}\nplain</p></blockquote>')
})
