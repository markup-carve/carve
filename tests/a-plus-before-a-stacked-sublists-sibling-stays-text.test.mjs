/*
 * The look-back for a `+` before a sibling marker reads every marker on a row,
 * so a sublist opened on its parent's marker line counts (carve#4390).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').replace(/ disabled> /g, ' disabled>')

const kept = /<ul><li>x<\/li><\/ul><p>\+<\/p><ul><li>y<\/li><\/ul>/

for (const source of [
  '- - x\n\n  +\n  - y\n',
  '* - x\n\n  +\n  - y\n',
  '- - - x\n\n    +\n    - y\n',
  '- a\n  - - x\n\n    +\n    - y\n',
  '> - - x\n>\n>   +\n>   - y\n',
]) {
  test(JSON.stringify(source), () => assert.match(render(source), kept))
}

test('the stacked list reads like the unstacked one at top level', () => {
  assert.match(render('- x\n\n+\n- y\n'), kept)
})

test('a + before a paragraph still attaches it', () => {
  assert.match(render('- - x\n\n  +\n  y\n'), /<ul><li>x y ?<\/li><\/ul>/)
})

test('a marker chain that stops short of the column is not a sibling', () => {
  assert.match(render('- - x\n\n   +\n   - y\n'), /\+/)
})
