/*
 * A task box is content, so a sublist on a task item's marker line keeps its
 * literal column, and a `+` reaches that sublist there and nowhere else.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').replace(/ disabled> /g, ' disabled>')

const attached = /<ul><li>x tail ?<\/li><\/ul>/
const refused = /<ul><li>x<\/li><\/ul><p>\+ tail<\/p>/

for (const [source, shape] of [
  ['- [ ] - x\n\n      +\n      tail\n', attached],
  ['- [ ] - x\n      +\n      tail\n', attached],
  ['- [ ] - x\n\n      +\n  tail\n', refused],
  ['- [ ] - x\n\n  +\n  tail\n', refused],
]) {
  test(JSON.stringify(source), () => assert.match(render(source), shape))
}

test('a + at a task sublist column ends its open fence', () => {
  assert.match(render('- [ ] - ```\n      +\n      tail\n'), /<li><pre><code><\/code><\/pre> tail ?<\/li>/)
})

test('every box state and marker reads alike', () => {
  for (const box of ['[ ]', '[x]', '[-]', '[_]']) {
    for (const marker of ['- ', '* ', '1. ']) {
      const column = 2 + 4
      const source = `- ${box} ${marker}x\n${' '.repeat(column)}+\n${' '.repeat(column)}tail\n`
      assert.match(render(source), /<li>x tail ?<\/li>/, source)
    }
  }
})
